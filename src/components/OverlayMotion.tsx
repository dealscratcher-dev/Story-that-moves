import { useEffect, useRef } from 'react';
import type { MotionType, StoryboardScene } from '../types/storyboard';
import { pathFinder } from '../utils/pathFinder';

interface OverlayMotionProps {
  isActive: boolean;
  scene?: StoryboardScene | null;
}

interface GridPoint {
  x: number;
  y: number;
}

export default function OverlayMotion({ isActive, scene }: OverlayMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const gridCache = useRef<GridPoint[]>([]);

  const emotionEmojis: Record<string, string[]> = {
    fear: ['😨', '😱', '👻'],
    joy: ['☀️', '✨', '🎈'],
    anger: ['😡', '🔥', '💢'],
    sadness: ['💧', '🌧️', '🌑'],
    trust: ['🤝', '🛡️', '🙏'],
    surprise: ['😲', '‼️', '⚡'],
    neutral: ['⚪', '🌫️', '💠']
  };

  /**
   * FIXED STAGE DETECTION: 
   * Now properly checks if canvas coordinates overlap with text elements
   */
  const updateStageGrid = (width: number, height: number) => {
    const points: GridPoint[] = [];
    const step = 45;

    // Find all blocker elements (text, images, nav)
    const blockers = Array.from(document.querySelectorAll('p, img, h1, h2, h3, h4, h5, h6, table, font, li, a, span, div'));
    
    // Filter to only elements with actual content or size
    const blockerRects = blockers
      .map(el => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        // Only consider visible elements with actual content
        if (style.display === 'none' || style.visibility === 'hidden') return null;
        if (rect.width === 0 || rect.height === 0) return null;
        // Check if element has text content
        const hasText = el.textContent && el.textContent.trim().length > 0;
        const isImage = el.tagName === 'IMG';
        if (!hasText && !isImage) return null;
        return rect;
      })
      .filter(rect => rect !== null);

    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        // Check if this canvas coordinate overlaps with any text/image block
        const isBlocked = blockerRects.some(rect => {
          if (!rect) return false;
          // Add small padding to avoid dots right at the edge of text
          const padding = 10;
          return x >= (rect.left - padding) && 
                 x <= (rect.right + padding) && 
                 y >= (rect.top - padding) && 
                 y <= (rect.bottom + padding);
        });

        // Only add points in white space (not blocked)
        if (!isBlocked) {
          points.push({ x, y });
        }
      }
    }
    
    console.log(`Grid updated: ${points.length} white space points found out of ${(width/step) * (height/step)} total`);
    gridCache.current = points;
    
    // Share the grid with pathFinder so it can snap paths to white space
    pathFinder.setStageGrid(points);
    console.log('Stage grid shared with pathFinder:', points.length, 'points');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      updateStageGrid(canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    // Listen for scroll to re-calculate stage as new text appears
    window.addEventListener('scroll', resize, { passive: true });
    
    resize();

    let startTime = performance.now();

    const animate = (time: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive && scene) {
        const elapsed = time - startTime;
        const duration = scene.duration || 4000;
        const progress = (elapsed % duration) / duration;

        // --- 1. THE STAGE (True White-Space Detection) ---
        ctx.save();
        ctx.globalAlpha = 0.4;
        gridCache.current.forEach(point => {
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // --- 2. THE PATHS ---
        const hints = scene.layout_hints?.length ? scene.layout_hints : [{ x: 0.5, y: 0.5 }];
        
        // Generate the white-space-constrained path with high resolution
        const pathPoints = pathFinder.generatePathPoints(hints, 150, canvas.width, canvas.height);
        
        if (pathPoints.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([8, 8]);
          ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // More visible blue
          ctx.lineWidth = 3;
          pathPoints.forEach((p, i) => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        }

        // --- 3. THE CAST ---
        const beats = scene.action_beats || [];
        const entities = beats.length > 0 ? beats : [{
          entity: 'narrator',
          emotion: scene.emotion_curve?.primary || 'neutral'
        }];

        entities.forEach((beat, index) => {
          // Get position along the pre-computed white-space path
          if (pathPoints.length === 0) return;
          
          const pathIndex = Math.floor(progress * (pathPoints.length - 1));
          const currentPoint = pathPoints[pathIndex];
          
          // Calculate angle from path direction
          const nextIndex = Math.min(pathIndex + 1, pathPoints.length - 1);
          const nextPoint = pathPoints[nextIndex];
          const angle = Math.atan2(
            (nextPoint.y - currentPoint.y) * canvas.height,
            (nextPoint.x - currentPoint.x) * canvas.width
          );
          
          // Apply separation for multiple entities (but keep them on nearby white space)
          const separation = (index - (entities.length - 1) / 2) * 70;
          let rawX = currentPoint.x * canvas.width + (index % 2 === 0 ? separation : -separation);
          let rawY = currentPoint.y * canvas.height;
          
          // Snap final position to white space
          const finalSnapped = pathFinder.snapToStage(
            rawX / canvas.width, 
            rawY / canvas.height, 
            canvas.width, 
            canvas.height
          );
          
          const x = finalSnapped.x * canvas.width;
          const y = finalSnapped.y * canvas.height;

          // DEBUG: Draw a small circle at the snapped position to verify it's in white space
          ctx.save();
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(x, y, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          const emojis = emotionEmojis[beat.emotion] || emotionEmojis.neutral;
          const size = 45 + (scene.emotion_curve?.intensity || 0.5) * 20;

          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'white';
          ctx.font = `${size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.translate(x, y);
          ctx.rotate(angle * 0.15);
          ctx.fillText(emojis[0], 0, 0);
          
          ctx.rotate(-(angle * 0.15));
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillText(beat.entity.toUpperCase(), 0, size/1.5);
          ctx.restore();
        });
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', resize);
    };
  }, [isActive, scene]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100000, display: isActive ? 'block' : 'none' }}
    />
  );
}

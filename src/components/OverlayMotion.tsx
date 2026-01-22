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
   * STAGE DETECTION: 
   * Maps out "Legal" play areas by avoiding DOM element bounding boxes.
   */
  const updateStageGrid = (width: number, height: number) => {
    const points: GridPoint[] = [];
    const step = 45;

    // Detect all text/image containers on the page
    const blockers = Array.from(document.querySelectorAll('p, img, h1, h2, table, li, font, .article-body'));
    
    const blockerRects = blockers
      .map(el => el.getBoundingClientRect())
      .filter(rect => rect.width > 0 && rect.height > 0);

    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        // Add 15px safety padding around text
        const isBlocked = blockerRects.some(rect => 
          x >= (rect.left - 15) && x <= (rect.right + 15) && 
          y >= (rect.top - 15) && y <= (rect.bottom + 15)
        );

        if (!isBlocked) {
          points.push({ x, y });
        }
      }
    }
    gridCache.current = points;
    pathFinder.setStageGrid(points);
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
    window.addEventListener('scroll', resize, { passive: true });
    resize();

    let startTime = performance.now();

    const animate = (time: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive && scene) {
        const elapsed = time - startTime;
        const duration = scene.duration || 6000;
        const progress = (elapsed % duration) / duration;

        // --- 1. DRAW THE RED DOT STAGE ---
        ctx.save();
        ctx.globalAlpha = 0.3;
        gridCache.current.forEach(point => {
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // --- 2. GENERATE & DRAW THE PATH ---
        const hints = scene.layout_hints?.length ? scene.layout_hints : [{ x: 0.5, y: 0.5 }];
        
        // Generate a high-res path that is already snapped to the grid
        const pathPoints = pathFinder.generatePathPoints(hints, 100, canvas.width, canvas.height);

        if (pathPoints.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([5, 10]);
          ctx.strokeStyle = 'rgba(255, 68, 68, 0.2)';
          ctx.lineWidth = 2;
          pathPoints.forEach((p, i) => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        }

        // --- 3. RENDER THE CAST (Objects follow the blue line exactly) ---
        const beats = scene.action_beats || [{
          entity: 'narrator',
          emotion: scene.emotion_curve?.primary || 'neutral'
        }];

        beats.forEach((beat, index) => {
          if (pathPoints.length < 2) return;

          // Find current position on the pre-computed path
          const pointIndex = Math.floor(progress * (pathPoints.length - 1));
          const pos = pathPoints[pointIndex];
          
          // Calculate heading angle
          const nextPos = pathPoints[Math.min(pointIndex + 5, pathPoints.length - 1)];
          const angle = Math.atan2(
            (nextPos.y - pos.y) * canvas.height,
            (nextPos.x - pos.x) * canvas.width
          );

          // Entity Styling
          const emojis = emotionEmojis[beat.emotion] || emotionEmojis.neutral;
          const intensity = scene.emotion_curve?.intensity || 0.5;
          const size = 50 + (intensity * 20);

          ctx.save();
          // Translate to the path coordinate
          ctx.translate(pos.x * canvas.width, pos.y * canvas.height);
          
          // Subtle hover offset (breathing effect)
          const hover = Math.sin(time / 300 + index) * 5;
          ctx.translate(0, hover);

          // Draw Shadow/Halo
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'white';
          
          // Render Emoji
          ctx.font = `${size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.rotate(angle * 0.1); // Lean into the turn
          ctx.fillText(emojis[0], 0, 0);

          // Render Label
          ctx.rotate(-(angle * 0.1));
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 0;
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

import { useEffect, useRef } from 'react';
import type { MotionType, StoryboardScene } from '../types/storyboard';
import { pathFinder } from '../utils/pathFinder';

interface OverlayMotionProps {
  motionType?: MotionType;
  intensity?: number;
  emotion?: string;
  isActive: boolean;
  scene?: StoryboardScene | null;
}

interface GridPoint {
  x: number;
  y: number;
}

export default function OverlayMotion({ 
  isActive, 
  scene 
}: OverlayMotionProps) {
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
    anticipation: ['⏳', '🚀', '🔭'],
    neutral: ['⚪', '🌫️', '💠']
  };

  /**
   * PROBE LOGIC: Scans the underlying page to find white space.
   * This ensures red dots don't cover text as seen in your conceptual goal.
   */
  const updateStageGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const points: GridPoint[] = [];
    const step = 45; // Density of the stage grid

    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        try {
          // Probe the background color at this coordinate
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          
          // Detect white space: RGB values above 245
          const isWhite = pixel[0] > 245 && pixel[1] > 245 && pixel[2] > 245;
          const isTransparent = pixel[3] < 10;

          if (isWhite || isTransparent) {
            points.push({ x, y });
          }
        } catch (e) {
          // Fallback if cross-origin restricts pixel access
          points.push({ x, y });
        }
      }
    }
    gridCache.current = points;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // willReadFrequently optimizes the getImageData calls
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (isActive) updateStageGrid(ctx, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let startTime = performance.now();

    const animate = (time: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive && scene) {
        const elapsed = time - startTime;
        const duration = scene.duration || 4000;
        const progress = (elapsed % duration) / duration;

        // --- 1. THE STAGE (Option B: Smart White-Space Grid) ---
        ctx.save();
        ctx.globalAlpha = 0.3; // Visible but subtle
        gridCache.current.forEach(point => {
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // --- 2. THE PATHS (Option A: Spline Navigation) ---
        const hints = scene.layout_hints?.length ? scene.layout_hints : [{ x: 0.5, y: 0.5 }];

        if (hints.length > 1) {
          ctx.save();
          const pathPoints = pathFinder.generatePathPoints(hints, 60);
          ctx.beginPath();
          ctx.setLineDash([8, 12]);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          pathPoints.forEach((p, i) => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        }

        // --- 3. THE CAST (Orchestration) ---
        const beats = scene.action_beats || [];
        const entitiesToRender = beats.length > 0 ? beats : [{
          entity: 'narrator',
          emotion: scene.emotion_curve?.primary || 'neutral',
          action: 'narrate'
        }];

        entitiesToRender.forEach((beat, index) => {
          const pathData = pathFinder.getPointOnPath(hints, progress);
          const separation = (index - (entitiesToRender.length - 1) / 2) * 60;
          
          const x = pathData.x * canvas.width + (index % 2 === 0 ? separation : -separation);
          const y = pathData.y * canvas.height;

          if (isNaN(x) || isNaN(y)) return;

          const emojis = emotionEmojis[beat.emotion] || emotionEmojis.neutral;
          const size = 45 + (scene.emotion_curve?.intensity || 0.5) * 25;

          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'white';
          ctx.font = `${size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Entity Rendering with slight rotation based on path heading
          ctx.translate(x, y);
          ctx.rotate(pathData.angle * 0.1); 
          ctx.fillText(emojis[0], 0, 0);

          // Metadata Label
          ctx.rotate(-(pathData.angle * 0.1));
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 0;
          ctx.fillText(`${beat.entity.toUpperCase()}`, 0, size / 1.5);
          ctx.restore();
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, scene]);

  return (
    <canvas
      ref={canvasRef}
      id="narrative-animation-layer"
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 100000, 
        display: isActive ? 'block' : 'none',
        background: 'transparent'
      }}
    />
  );
}

import { useEffect, useRef, useState } from 'react';
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
  isAllowed: boolean;
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

  // Generate the stage map: Only marks "white space" as valid dots
  const updateStageGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const points: GridPoint[] = [];
    const step = 45; // Density of the red dot grid

    // We temporarily read the background
    // Note: This requires the iframe/page background to be accessible
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        try {
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          // Check if pixel is white (RGB > 240) or transparent (Alpha close to 0)
          const isWhite = pixel[0] > 240 && pixel[1] > 240 && pixel[2] > 240;
          const isTransparent = pixel[3] < 10;
          
          if (isWhite || isTransparent) {
            points.push({ x, y, isAllowed: true });
          }
        } catch (e) {
          // Fallback if cross-origin prevents pixel reading: draw full grid
          points.push({ x, y, isAllowed: true });
        }
      }
    }
    gridCache.current = points;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

        // --- 1. THE STAGE (Option B: Red Dot White-Space Grid) ---
        ctx.save();
        ctx.globalAlpha = 0.4;
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
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
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
        const beats = scene.action_beats?.length ? scene.action_beats : [{
          entity: 'narrator',
          emotion: scene.emotion_curve?.primary || 'neutral',
          action: 'narrate'
        }];

        beats.forEach((beat, index) => {
          const basePos = pathFinder.getPointOnPath(hints, progress);
          const separation = (index - (beats.length - 1) / 2) * 70;
          
          // Entites move on the grid
          const x = basePos.x * canvas.width + (index % 2 === 0 ? separation : -separation);
          const y = basePos.y * canvas.height;

          if (isNaN(x) || isNaN(y)) return;

          const emojis = emotionEmojis[beat.emotion] || emotionEmojis.neutral;
          const size = 50 + (scene.emotion_curve?.intensity || 0.5) * 20;

          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'white';
          ctx.font = `${size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Entity rotation based on spline heading
          ctx.translate(x, y);
          ctx.rotate(basePos.angle * 0.2); // Subtle tilt toward direction
          ctx.fillText(emojis[0], 0, 0);

          // Label
          ctx.rotate(-(basePos.angle * 0.2));
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillText(beat.entity.toUpperCase(), 0, size / 1.5);
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

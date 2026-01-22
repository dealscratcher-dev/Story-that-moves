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

export default function OverlayMotion({ 
  isActive, 
  scene 
}: OverlayMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  // Comprehensive Mapping for Narrative Entities
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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

        // --- 1. THE STAGE (Option B: Coordinate Grid) ---
        // Draws the "legal" play area bounds
        ctx.save();
        ctx.globalAlpha = 0.08;
        const gridSize = 60; // Approx 1 inch square feel
        for (let gx = 0; gx < canvas.width; gx += gridSize) {
          for (let gy = 0; gy < canvas.height; gy += gridSize) {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // --- 2. THE PATHS (Option A: Spline Navigation) ---
        const hints = scene.layout_hints && scene.layout_hints.length > 0 
          ? scene.layout_hints 
          : [{ x: 0.5, y: 0.5 }];

        if (hints.length > 1) {
          ctx.save();
          const pathPoints = pathFinder.generatePathPoints(hints, 60);
          ctx.beginPath();
          ctx.setLineDash([8, 12]);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
          pathPoints.forEach((p, i) => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        }

        // --- 3. THE CAST (Multi-Entity Orchestration) ---
        const beats = scene.action_beats || [];
        
        // If no beats, default to a single narrator entity
        const entitiesToRender = beats.length > 0 ? beats : [{
          entity: 'narrator',
          emotion: scene.emotion_curve?.primary || 'neutral',
          action: 'narrate'
        }];

        entitiesToRender.forEach((beat, index) => {
          // Robust Coordinate Calculation
          const basePos = pathFinder.getPointOnPath(hints, progress);
          
          // Spatial Separation: Prevents entities from stacking
          // Shifts each entity slightly so the 'man' and 'dragon' have room
          const separation = (index - (entitiesToRender.length - 1) / 2) * 60;
          
          const x = basePos.x * canvas.width + (index % 2 === 0 ? separation : -separation);
          const y = basePos.y * canvas.height;

          if (isNaN(x) || isNaN(y)) return;

          // Visual Styling
          const emojis = emotionEmojis[beat.emotion] || emotionEmojis.neutral;
          const intensityScale = scene.emotion_curve?.intensity || 0.5;
          const size = 45 + (intensityScale * 25);

          ctx.save();
          // Halo for visibility over article text
          ctx.shadowBlur = 25;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
          
          ctx.font = `${size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Render the Entity
          ctx.fillText(emojis[0], x, y);

          // Debug Metadata (Tiny label below entity)
          ctx.font = '12px Inter, system-ui, sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 0;
          ctx.fillText(`${beat.entity} (${beat.action})`, x, y + size/1.5);
          
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
      className="fixed inset-0 pointer-events-none transition-opacity duration-500"
      style={{ 
        zIndex: 100000, // Topmost layer
        display: isActive ? 'block' : 'none',
        background: 'transparent',
        pointerEvents: 'none'
      }}
    />
  );
}

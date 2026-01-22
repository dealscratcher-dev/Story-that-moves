import { useEffect, useRef } from 'react';
import type { MotionType, StoryboardScene } from '../types/storyboard';
import { pathFinder } from '../utils/pathFinder';

interface OverlayMotionProps {
  motionType: MotionType;
  intensity: number;
  emotion: string;
  isActive: boolean;
  scene?: StoryboardScene | null;
}

export default function OverlayMotion({ 
  motionType = 'drift', 
  intensity = 0.5, 
  emotion = 'neutral', 
  isActive, 
  scene 
}: OverlayMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  // Updated Mapping: Added direct matches for MongoDB emotion keys
  const emotionEmojis: Record<string, string[]> = {
    fear: ['😨', '😰', '😱'],      //
    joy: ['☀️', '🌸', '🎈'],       // Added for MongoDB 'joy'
    anger: ['😡', '🔥', '💢'],     // Added for MongoDB 'anger'
    sadness: ['💧', '🌧️', '🌑'],   // Added for MongoDB 'sadness'
    calm: ['🌊', '🍃', '☁️'],
    tense: ['⚡', '🔥', '💥'],
    exciting: ['✨', '🚀', '🎉'],
    mysterious: ['🔮', '🌌', '👁️'],
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive && scene) {
        // 1. Extract Data from Scene
        const activeEmotion = scene.emotion_curve?.primary || 'neutral';
        const activeIntensity = scene.emotion_curve?.intensity || 0.5;
        const hints = scene.layout_hints && scene.layout_hints.length > 0 
          ? scene.layout_hints 
          : [{ x: 0.5, y: 0.5 }];
          
        const elapsed = time - startTime;
        const duration = scene.duration || 4000;
        const progress = (elapsed % duration) / duration;

        // 2. PATH VISUALIZATION (Debugging Layer)
        if (hints.length > 1) {
          ctx.save();
          // Draw the smooth spline path
          const pathPoints = pathFinder.generatePathPoints(hints, 100);
          ctx.beginPath();
          ctx.setLineDash([5, 8]); // Dashed line
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Faint gray
          ctx.lineWidth = 1.5;

          pathPoints.forEach((p, index) => {
            const px = p.x * canvas.width;
            const py = p.y * canvas.height;
            if (index === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();

          // Draw "Heat Map" dots for actual layout_hints in DB
          hints.forEach(hint => {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; // Transparent red
            ctx.beginPath();
            ctx.arc(hint.x * canvas.width, hint.y * canvas.height, 4, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }

        // 3. CALCULATE CURRENT EMOJI POSITION
        const pos = pathFinder.getPointOnPath(hints, progress);
        const x = pos.x * canvas.width;
        const y = pos.y * canvas.height;

        // 4. DRAW EMOJI
        const emojis = emotionEmojis[activeEmotion] || emotionEmojis.neutral;
        ctx.save();
        
        // Dynamic sizing based on intensity
        const size = 50 + (activeIntensity * 25);
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add halo/glow for readability over dark text
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';

        if (!isNaN(x) && !isNaN(y)) {
          ctx.fillText(emojis[0], x, y);
        }
        ctx.restore();
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, scene, emotion]);

  return (
    <canvas
      ref={canvasRef}
      id="narrative-canvas-layer"
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 99999, 
        display: isActive ? 'block' : 'none',
        background: 'transparent',
        // Enhances visibility of the animation layer over the iframe content
        filter: 'drop-shadow(0px 0px 8px rgba(255,255,255,0.6))' 
      }}
    />
  );
}

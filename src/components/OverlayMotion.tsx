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

  // Mapping MongoDB emotion strings to Emojis
  const emotionEmojis: Record<string, string[]> = {
    fear: ['😨', '🌑', '👻'], // Added 'fear' to match your Mongo schema
    calm: ['🌊', '🍃', '☁️'],
    tense: ['⚡', '🔥', '💥'],
    exciting: ['✨', '🚀', '🎉'],
    sad: ['💧', '🌧️', '🌑'],
    joyful: ['☀️', '🌸', '🎈'],
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

      // DATA SAFETY CHECK
      if (isActive && scene) {
        // 1. EXTRACT NESTED DATA FROM MONGO SCHEMA
        // We check scene.emotion_curve.primary first, then fallback to props
        const activeEmotion = scene.emotion_curve?.primary || emotion || 'neutral';
        const activeIntensity = scene.emotion_curve?.intensity || intensity || 0.5;
        const hints = scene.layout_hints && scene.layout_hints.length > 0 
          ? scene.layout_hints 
          : [{ x: 0.5, y: 0.5 }]; // Center fallback

        const elapsed = time - startTime;
        const duration = scene.duration || 4000;
        const progress = (elapsed % duration) / duration; 

        // 2. PATHFINDING
        const pos = pathFinder.getPointOnPath(hints, progress);
        const x = pos.x * canvas.width;
        const y = pos.y * canvas.height;

        // 3. SELECT EMOJI
        const emojis = emotionEmojis[activeEmotion] || emotionEmojis.neutral;
        const actor = emojis[0];

        // 4. RENDERING
        ctx.save();
        
        // Motion FX based on intensity
        const pulse = motionType === 'pulse' ? Math.sin(time / 300) * 10 : 0;
        const size = 50 + (activeIntensity * 20) + pulse;

        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow Effect
        ctx.shadowBlur = 20 * activeIntensity;
        ctx.shadowColor = 'white';
        
        // Final Draw
        if (!isNaN(x) && !isNaN(y)) {
          ctx.fillText(actor, x, y);
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
  }, [isActive, scene, emotion, motionType, intensity]);

  return (
    <canvas
      ref={canvasRef}
      id="narrative-canvas-layer"
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 99999, 
        display: isActive ? 'block' : 'none',
        background: 'transparent',
        // Contrast enhancement to see over article text
        filter: 'drop-shadow(0px 0px 10px rgba(255,255,255,0.8))'
      }}
    />
  );
}

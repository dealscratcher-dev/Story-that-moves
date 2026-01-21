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

  // Updated Mapping: Added 'fear' to match your MongoDB data
  const emotionEmojis: Record<string, string[]> = {
    fear: ['😨', '😰', '👻', '😱'], // This maps to your "primary": "fear"
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

      if (isActive && scene) {
        // Correctly drill into the nested emotion_curve from your DB
        const activeEmotion = scene.emotion_curve?.primary || 'neutral';
        const activeIntensity = scene.emotion_curve?.intensity || 0.5;
        
        const elapsed = time - startTime;
        const duration = scene.duration || 4000;
        const progress = (elapsed % duration) / duration;

        // Pathfinding
        const hints = scene.layout_hints && scene.layout_hints.length > 0 
          ? scene.layout_hints 
          : [{ x: 0.5, y: 0.5 }];
          
        const pos = pathFinder.getPointOnPath(hints, progress);
        const x = pos.x * canvas.width;
        const y = pos.y * canvas.height;

        // Drawing
        const emojis = emotionEmojis[activeEmotion] || emotionEmojis.neutral;
        ctx.save();
        
        // Scale and Shadow for visibility over the iframe
        const size = 50 + (activeIntensity * 25);
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'white'; // Creates a "halo" so it's visible on black text

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
        // This filter helps the emoji pop against the white article background
        filter: 'drop-shadow(0px 0px 10px rgba(255,255,255,0.8))' 
      }}
    />
  );
}

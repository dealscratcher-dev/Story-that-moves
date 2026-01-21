import { useEffect, useRef, useState } from 'react';
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
  const animationRef = useRef<number>();
  const [debugLog, setDebugLog] = useState("");
  
  const emotionEmojis: Record<string, string[]> = {
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
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. FORCE INITIAL SIZE
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let startTime: number | null = null;
    
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      
      // Use the scene duration or a default 4s loop
      const duration = scene?.duration || 4000;
      const progress = (elapsed % duration) / duration; 

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. DATA CHECK (The most likely failure point)
      const hints = scene?.layout_hints || [{x: 0.2, y: 0.2}, {x: 0.8, y: 0.8}];
      const emojis = emotionEmojis[emotion] || emotionEmojis.neutral;
      const actor = emojis[0];

      // 3. CALCULATE POSITION
      const pos = pathFinder.getPointOnPath(hints, progress);
      const screenX = pos.x * canvas.width;
      const screenY = pos.y * canvas.height;

      // 4. RENDER
      ctx.save();
      
      // Add a glow so it's visible against any background
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'white';
      
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Drawing logic
      ctx.fillText(actor, screenX, screenY);
      
      // DEBUG MODE: If you still can't see it, this red box will tell us why
      /*
      ctx.fillStyle = 'red';
      ctx.fillRect(20, 20, 10, 10); 
      */

      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, scene, emotion]); // Re-run when scene/emotion changes

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]" // Absolute top
      style={{ mixBlendMode: 'normal' }}
    />
  );
}

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
    // 1. Critical Initialization
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      console.log("Canvas Resized to:", canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let startTime = performance.now();

    const animate = (time: number) => {
      // 2. Clear Screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive && scene) {
        const elapsed = time - startTime;
        const duration = scene.duration || 3500;
        const progress = (elapsed % duration) / duration; // Continuous Loop

        // 3. Get Path Data
        const hints = scene.layout_hints && scene.layout_hints.length > 0 
          ? scene.layout_hints 
          : [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }]; // Diagonal Fallback

        const pos = pathFinder.getPointOnPath(hints, progress);
        
        // 4. Transform to Pixels
        const x = pos.x * canvas.width;
        const y = pos.y * canvas.height;

        // 5. Draw Emoji
        const emojis = emotionEmojis[emotion] || emotionEmojis.neutral;
        ctx.save();
        ctx.font = '50px serif'; // Large size for visibility
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Shadow for contrast against iframe text
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 255, 255, 1)';
        
        ctx.fillText(emojis[0], x, y);
        ctx.restore();

        // 6. Debug: If you see this red dot, the pathfinder is working
        /*
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        */
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
        zIndex: 99999, // Force to the absolute front
        display: isActive ? 'block' : 'none',
        background: 'transparent'
      }}
    />
  );
}

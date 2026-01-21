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
    fear: ['😨', '🌑', '👻'], // Added to match your Mongo "fear" label
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
      console.log("Canvas Engine: Resized to", canvas.width, "x", canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    let startTime = performance.now();

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- DEBUG BOX ---
      // If you see a small purple box in the top left, the canvas IS working.
      // If you DON'T see this, the canvas is hidden behind another layer.
      ctx.fillStyle = 'rgba(128, 0, 128, 0.5)';
      ctx.fillRect(10, 10, 20, 20);

      // Check for isActive and the existence of scene
      if (isActive) {
        const elapsed = time - startTime;
        
        // 1. DATA DRILLING (Patching for your MongoDB Schema)
        const currentEmotion = scene?.emotion_curve?.primary || emotion || 'neutral';
        const currentIntensity = scene?.emotion_curve?.intensity || intensity || 0.5;
        const duration = scene?.duration || 4000;
        
        // 2. PATH FALLBACK (If hints are missing, glide diagonal)
        const hints = (scene?.layout_hints && scene.layout_hints.length > 0)
          ? scene.layout_hints 
          : [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }];

        const progress = (elapsed % duration) / duration;
        const pos = pathFinder.getPointOnPath(hints, progress);
        
        const x = pos.x * canvas.width;
        const y = pos.y * canvas.height;

        // 3. SELECTION
        const emojis = emotionEmojis[currentEmotion] || emotionEmojis.neutral;
        const actor = emojis[0];

        // 4. RENDER
        ctx.save();
        
        // Scale based on intensity
        const baseSize = 50;
        const pulse = Math.sin(time / 400) * 5;
        ctx.font = `${baseSize + (currentIntensity * 30) + pulse}px serif`;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow/Shadow for visibility over text
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 255, 255, 1)';
        
        // If position is valid, draw
        if (!isNaN(x) && !isNaN(y)) {
          ctx.fillText(actor, x, y);
        } else {
          // Fallback Draw at center if Math fails
          ctx.fillText(actor, canvas.width / 2, canvas.height / 2);
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
  }, [isActive, scene, emotion, intensity]);

  return (
    <canvas
      ref={canvasRef}
      id="narrative-canvas-layer"
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 9999, // Lowered slightly from 99999 to ensure HUD stays on top
        display: 'block', // Always block for debugging
        background: 'transparent',
        opacity: isActive ? 1 : 0, // Control visibility via opacity
        transition: 'opacity 0.5s ease'
      }}
    />
  );
}

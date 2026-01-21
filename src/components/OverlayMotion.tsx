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
  const animationRef = useRef<number>();
  
  const emotionEmojis: Record<string, string[]> = {
    calm: ['🌊', '🍃', '☁️'],
    tense: ['⚡', '🔥', '💥'],
    exciting: ['✨', '🚀', '🎉'],
    sad: ['💧', '🌧️', '🌑'],
    joyful: ['☀️', '🌸', '🎈'],
    mysterious: ['🔮', '🌌', '👁️'],
    neutral: ['⚪', '🌫️', '💠']
  };

  const toneMap: Record<string, string> = {
    calm: '100, 116, 139',      
    tense: '20, 20, 20',       
    exciting: '234, 179, 8',   
    sad: '71, 85, 105',        
    joyful: '59, 130, 246',    
    mysterious: '139, 92, 246', 
    neutral: '148, 163, 184'   
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || !scene) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions immediately
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // IMPORTANT: Reset startTime to null so it captures the first frame of the new scene
    let startTime: number | null = null;
    const duration = scene.duration || 3500;
    const currentEmojis = emotionEmojis[emotion] || emotionEmojis.neutral;
    const actorEmoji = currentEmojis[0];

    const animate = (currentTime: number) => {
      if (!ctx || !canvas) return;
      if (!startTime) startTime = currentTime; // Lock the start time on first frame

      const elapsed = currentTime - startTime;
      // We use a small epsilon to ensure it doesn't vanish at the very end
      const progress = Math.min(elapsed / duration, 0.99); 
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. PATH DATA
      const hints = scene.layout_hints && scene.layout_hints.length > 0 
        ? scene.layout_hints 
        : [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.6 }]; // Fallback path
      
      const pos = pathFinder.getPointOnPath(hints, progress);
      const x = pos.x * canvas.width;
      const y = pos.y * canvas.height;

      const rgb = toneMap[emotion] || '148, 163, 184';
      let currentSize = 45 * (1 + intensity * 0.2); // Made slightly larger
      let currentOpacity = 0.9;

      // 2. MOTION FX
      if (motionType === 'breathe') {
        currentSize *= (1 + Math.sin(currentTime / 600) * 0.1);
      } else if (motionType === 'pulse') {
        currentOpacity = 0.6 + Math.abs(Math.sin(currentTime / 300)) * 0.4;
      }

      // 3. DRAW DOTTED PATH
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 15]);
      ctx.strokeStyle = `rgba(${rgb}, 0.3)`;
      const previewPoints = pathFinder.generatePathPoints(hints, 20);
      previewPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
        else ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      });
      ctx.stroke();
      ctx.restore();

      // 4. RENDER ACTOR
      ctx.save();
      ctx.font = `${currentSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = currentOpacity;
      ctx.shadowBlur = 15;
      ctx.shadowColor = `rgba(${rgb}, 0.5)`;
      
      // Safety check: ensure coordinates are valid numbers
      if (!isNaN(x) && !isNaN(y)) {
        ctx.fillText(actorEmoji, x, y);
      }
      ctx.restore();

      // 5. HUD INFO
      ctx.save();
      ctx.fillStyle = `rgba(${rgb}, 0.8)`;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(emotion.toUpperCase(), canvas.width - 40, 100);
      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, scene, emotion, motionType, intensity]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]" // Increased z-index
      style={{ background: 'transparent' }}
    />
  );
}

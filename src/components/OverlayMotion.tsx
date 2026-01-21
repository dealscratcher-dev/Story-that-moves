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

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    let startTime = performance.now();
    // Use the duration from your Mongo storyboard or default to 3500ms
    const duration = scene.duration || 3500;
    
    // Select the emoji based on emotion state
    const currentEmojis = emotionEmojis[emotion] || emotionEmojis.neutral;
    const actorEmoji = currentEmojis[0];

    const animate = (currentTime: number) => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 1. PATH FINDING (Using the whitespace hints from DB)
      const hints = scene.layout_hints || [{ x: 0.5, y: 0.5 }];
      const pos = pathFinder.getPointOnPath(hints, progress);
      
      const x = pos.x * canvas.width;
      const y = pos.y * canvas.height;

      // 2. STYLE DNA & MOTION FX
      const rgb = toneMap[emotion] || '148, 163, 184';
      let currentSize = 38 * (1 + intensity * 0.2);
      let currentOpacity = 0.8;

      // Apply Motion Patterns
      if (motionType === 'breathe') {
        const breatheFactor = Math.sin(currentTime / 600) * 0.15;
        currentSize *= (1 + breatheFactor);
      } else if (motionType === 'pulse') {
        currentOpacity = 0.4 + Math.abs(Math.sin(currentTime / 300)) * 0.5;
      }

      // 3. DRAW PATH PREVIEW (Dotted line through whitespace)
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 12]);
      ctx.strokeStyle = `rgba(${rgb}, 0.2)`;
      ctx.lineWidth = 1;
      const pathPoints = pathFinder.generatePathPoints(hints, 25);
      pathPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
        else ctx.lineTo(p.x * canvas.width, p.y * canvas.height);
      });
      ctx.stroke();
      ctx.restore();

      // 4. RENDER EMOJI ACTOR
      ctx.save();
      ctx.font = `${currentSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = currentOpacity;
      
      // Add subtle glow based on emotion color
      ctx.shadowBlur = 20 * intensity;
      ctx.shadowColor = `rgba(${rgb}, 0.5)`;
      
      ctx.fillText(actorEmoji, x, y);
      ctx.restore();

      // 5. HUD RENDER (Status info)
      if (scene.description) {
        ctx.save();
        const hudX = canvas.width * 0.89;
        const hudY = 120;
        ctx.fillStyle = `rgba(${rgb}, 0.9)`;
        ctx.font = '900 10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`SEQ_${scene.sequence || 0}`, hudX, hudY - 25);
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.font = '600 14px Inter, sans-serif';
        ctx.fillText(emotion.toUpperCase(), hudX, hudY);
        ctx.restore();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, scene, emotion, motionType, intensity]);

  if (!isActive) return null;

  return (
    <>
      {/* UI Indicator Overlay */}
      <div className="fixed top-6 right-6 z-[60] flex items-center gap-3 pointer-events-none select-none">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              Path Live
            </span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ 
          background: 'transparent',
          backdropFilter: 'contrast(1.02)'
        }}
      />
    </>
  );
}

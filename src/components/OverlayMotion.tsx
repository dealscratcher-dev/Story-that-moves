import { useEffect, useRef } from 'react';
import type { MotionType, StoryboardScene } from '../types/storyboard';

interface SafeZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
}

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
  const particlesRef = useRef<Particle[]>([]);
  
  const toneMap: Record<string, string> = {
    calm: '100, 116, 139',      // Slate 500
    tense: '20, 20, 20',       // Near black for tension
    exciting: '234, 179, 8',   // Yellow 500
    sad: '71, 85, 105',        // Slate 600
    joyful: '59, 130, 246',    // Blue 500
    mysterious: '139, 92, 246', // Violet 500
    neutral: '148, 163, 184'   // Slate 400
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initParticles = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const w = canvas.width;
      const h = canvas.height;
      const count = Math.floor(50 * intensity);
      
      const zones: SafeZone[] = [
        { x: 0, y: 0, width: w * 0.15, height: h },
        { x: w * 0.85, y: 0, width: w * 0.15, height: h },
      ];

      particlesRef.current = Array.from({ length: count }, () => {
        const zone = zones[Math.floor(Math.random() * zones.length)];
        return {
          x: zone.x + Math.random() * zone.width,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * intensity * 1.5,
          vy: (Math.random() - 0.5) * intensity * 1.5,
          size: Math.random() * 3 + 1, // Larger particles for visibility
          opacity: Math.random() * 0.4 + 0.2,
          phase: Math.random() * Math.PI * 2
        };
      });
    };

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    initParticles();

    let time = 0;
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;
      
      const rgb = toneMap[emotion] || '148, 163, 184';

      // 1. HUD RENDER
      if (scene && scene.type) {
        ctx.save();
        const hudX = canvas.width * 0.89;
        const hudY = 120;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = `rgba(${rgb}, 1)`;
        ctx.font = '900 10px Inter, sans-serif';
        ctx.fillText(scene.type.toUpperCase(), hudX, hudY - 25);
        ctx.fillStyle = '#111111';
        ctx.font = '600 18px Inter, sans-serif';
        ctx.fillText(scene.name || 'Narrative Pulse', hudX, hudY);
        ctx.restore();
      }

      // 2. PARTICLE ENGINE
      particlesRef.current.forEach((p, i) => {
        ctx.save();
        if (motionType === 'breathe') {
          const b = Math.sin(time * 0.8 + p.phase) * intensity;
          ctx.globalAlpha = p.opacity * (1 + b * 0.4);
          p.y += Math.sin(time * 0.5) * 0.2;
        } else if (motionType === 'pulse') {
          const pul = Math.abs(Math.sin(time * 2 + p.phase)) * intensity;
          ctx.globalAlpha = p.opacity + (pul * 0.3);
        } else {
          p.y += p.vy * 0.3;
          if (p.y > canvas.height) p.y = 0;
          if (p.y < 0) p.y = canvas.height;
        }

        ctx.fillStyle = `rgba(${rgb}, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [motionType, intensity, emotion, isActive, scene]);

  if (!isActive) return null;

  return (
    <>
      {/* 🚀 ENGINE SIGNAL TAG: Top-right status indicator */}
      <div className="fixed top-6 right-6 z-[60] flex items-center gap-3 pointer-events-none select-none">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              Engine Live
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1 mr-2 bg-white/40 px-1">
            {motionType.toUpperCase()} // {emotion.toUpperCase()}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-1000"
        style={{ 
          mixBlendMode: 'multiply', 
          opacity: 0.8,
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 100%)',
          backdropFilter: 'contrast(1.01) brightness(1.01)'
        }}
      />
    </>
  );
}

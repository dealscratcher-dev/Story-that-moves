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
  
  // Adjusted toneMap: Using darker grays so particles are visible on white pages
  const toneMap: Record<string, string> = {
    calm: '148, 163, 184',
    tense: '100, 100, 100',
    exciting: '255, 180, 0',
    sad: '71, 85, 105',
    joyful: '100, 150, 255',
    mysterious: '139, 92, 246',
    neutral: '150, 150, 150'
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
      const count = Math.floor(40 * intensity);
      
      const zones: SafeZone[] = [
        { x: 0, y: 0, width: w * 0.12, height: h },
        { x: w * 0.88, y: 0, width: w * 0.12, height: h },
      ];

      particlesRef.current = Array.from({ length: count }, () => {
        const zone = zones[Math.floor(Math.random() * zones.length)];
        return {
          x: zone.x + Math.random() * zone.width,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * intensity * 1.5,
          vy: (Math.random() - 0.5) * intensity * 1.5,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.3 + 0.1,
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
      
      const rgb = toneMap[emotion] || '150, 150, 150';

      // 1. HUD RENDER (Using dark text for clarity on white background)
      if (scene && scene.type) {
        ctx.save();
        const hudX = canvas.width * 0.89;
        const hudY = 120;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = `rgba(${rgb}, 1)`;
        ctx.font = '900 10px Inter, sans-serif';
        ctx.fillText(scene.type.toUpperCase(), hudX, hudY - 25);
        ctx.fillStyle = '#111111'; // Sharp dark text
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
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-1000"
      style={{ 
        // 🚀 THE FIX: Changed to 'multiply' and white wash
        mixBlendMode: 'multiply', 
        opacity: 0.9,
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.1) 100%)',
        backdropFilter: 'contrast(1.02) brightness(1.02)'
      }}
    />
  );
}

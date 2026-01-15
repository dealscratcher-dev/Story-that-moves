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
    calm: '148, 163, 184',
    tense: '200, 200, 255',
    exciting: '255, 230, 100',
    sad: '100, 116, 139',
    joyful: '255, 255, 255',
    mysterious: '167, 139, 250',
    neutral: '226, 232, 240'
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
      // Ensure at least some particles exist even at low intensity
      const count = Math.floor(40 * (intensity || 0.3));
      
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
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.3 + 0.05, // Lowered for subtler feel
          phase: Math.random() * Math.PI * 2
        };
      });
    };

    const handleResize = () => {
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
      
      const rgb = toneMap[emotion] || '255, 255, 255';

      // 1. HUD RENDER
      if (scene && scene.type) {
        ctx.save();
        const hudX = canvas.width * 0.92;
        const hudY = 100;
        ctx.globalAlpha = Math.sin(time * 1.5) * 0.05 + 0.8;
        ctx.fillStyle = `rgba(${rgb}, 0.5)`;
        ctx.font = 'bold 9px "Inter", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(scene.type.toUpperCase(), hudX, hudY - 20);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '500 14px "Inter", sans-serif';
        ctx.fillText(scene.name || 'Processing...', hudX, hudY);
        ctx.restore();
      }

      // 2. PARTICLE ENGINE
      particlesRef.current.forEach((p, i) => {
        ctx.save();
        
        if (motionType === 'breathe') {
          const b = Math.sin(time * 0.8 + p.phase) * intensity;
          ctx.globalAlpha = p.opacity * (1 + b * 0.4);
          p.y += Math.sin(time * 0.5) * 0.1;
        } else if (motionType === 'pulse') {
          const pul = Math.abs(Math.sin(time * 2 + p.phase)) * intensity;
          ctx.shadowBlur = pul * 8;
          ctx.shadowColor = `rgba(${rgb}, 0.5)`;
        } else if (motionType === 'wave') {
          p.x += Math.cos(time + i) * 0.3;
          p.y += Math.sin(time + i) * 0.3;
        } else {
          p.y += p.vy * 0.2;
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
        mixBlendMode: 'screen', 
        opacity: 0.6, // Lightened overall opacity
        background: 'transparent' // 🛡️ REMOVED THE DARK GRADIENT
      }}
    />
  );
}

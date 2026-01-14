import { useEffect, useRef, useState } from 'react';
import type { MotionType, StoryboardScene } from '../types/storyboard';

interface OverlayMotionProps {
  motionType: MotionType;
  intensity: number;
  emotion: string;
  isActive: boolean;
  scene?: StoryboardScene | null;
  onZonesUpdate?: (zones: SafeZone[], scrollY: number) => void;
}

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

export default function OverlayMotion({ 
  motionType, 
  intensity, 
  emotion, 
  isActive, 
  scene, 
  onZonesUpdate 
}: OverlayMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);

  const toneMap: Record<string, string> = {
    calm: '148, 163, 184',      // Slate
    tense: '255, 255, 255',     // White
    exciting: '255, 230, 100',  // Warm Gold
    sad: '71, 85, 105',         // Deep Slate
    joyful: '248, 250, 252',    // Silver
    mysterious: '139, 92, 246', // Soft Violet
    neutral: '200, 200, 200'    // Gray
  };

  const detectSafeZones = (): SafeZone[] => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return [
      { x: 0, y: 0, width: w * 0.12, height: h },        // Left Margin
      { x: w * 0.88, y: 0, width: w * 0.12, height: h }, // Right Margin
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const zones = detectSafeZones();
      setSafeZones(zones);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Init Particles
    if (particlesRef.current.length === 0) {
      const count = Math.floor(50 * intensity);
      particlesRef.current = Array.from({ length: count }, () => {
        const zone = safeZones[Math.floor(Math.random() * safeZones.length)];
        return {
          x: zone ? zone.x + Math.random() * zone.width : Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * intensity * 2,
          vy: (Math.random() - 0.5) * intensity * 2,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          phase: Math.random() * Math.PI * 2
        };
      });
    }

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;
      const rgb = toneMap[emotion] || '255, 255, 255';

      // 1. DRAW NARRATIVE HUD (The Merged SceneOverlay)
      if (scene) {
        ctx.save();
        const hudX = canvas.width * 0.89;
        const hudY = 120;
        const alpha = Math.min(1, Math.max(0, Math.sin(time * 1.5) * 0.1 + 0.9));
        
        // Type Label
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgba(${rgb}, 0.6)`;
        ctx.font = '900 10px Inter, system-ui, sans-serif';
        ctx.fillText(scene.type.toUpperCase(), hudX, hudY - 25);
        
        // Name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '500 18px Inter, system-ui, sans-serif';
        ctx.fillText(scene.name || 'Narrative Pulse', hudX, hudY);
        
        // Intensity Bar
        ctx.strokeStyle = `rgba(${rgb}, 0.2)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hudX, hudY + 15);
        ctx.lineTo(hudX, hudY + 15 + (intensity * 80));
        ctx.stroke();
        ctx.restore();
      }

      // 2. PARTICLE MOTION ENGINE
      particlesRef.current.forEach((p, i) => {
        ctx.save();
        
        // Apply specific motion math
        switch (motionType) {
          case 'breathe':
            const b = Math.sin(time * 0.8 + p.phase) * intensity;
            ctx.globalAlpha = p.opacity * (1 + b * 0.4);
            p.y += Math.sin(time * 0.5) * 0.2;
            break;
          case 'pulse':
            const pul = Math.abs(Math.sin(time * 2 + p.phase)) * intensity;
            ctx.shadowBlur = pul * 10;
            ctx.shadowColor = `rgba(${rgb}, 0.8)`;
            break;
          case 'wave':
            p.x += Math.cos(time + i) * 0.5;
            p.y += Math.sin(time + i) * 0.5;
            break;
          case 'drift':
            p.y += p.vy * 0.3;
            if (p.y > canvas.height) p.y = 0;
            break;
        }

        ctx.fillStyle = `rgba(${rgb}, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [motionType, intensity, emotion, isActive, scene, safeZones]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-1000"
      style={{ 
        mixBlendMode: 'screen', 
        opacity: 0.8,
        background: 'radial-gradient(circle at 50% 50%, rgba(10,10,12,0) 0%, rgba(10,10,12,0.2) 100%)' 
      }}
    />
  );
}

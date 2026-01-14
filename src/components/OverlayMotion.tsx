import { useEffect, useRef, useState } from 'react';
import type { MotionType } from '../utils/narrativeAnalyzer';

interface OverlayMotionProps {
  motionType: MotionType;
  intensity: number;
  emotion: string;
  isActive: boolean;
  onZonesUpdate?: (zones: SafeZone[], scrollY: number) => void;
}

interface SafeZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function OverlayMotion({ motionType, intensity, emotion, isActive, onZonesUpdate }: OverlayMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastScrollY = useRef(0);
  const scrollThreshold = 80; // Sends data to pathfinder every 80px
  
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    phase: number; // For wave/pulse patterns
  }>>([]);

  // High-end monochromatic tones based on emotion
  const toneMap: Record<string, string> = {
    calm: '200, 210, 220',      // Slate
    tense: '255, 255, 255',     // White
    exciting: '255, 255, 255',  // White
    sad: '100, 116, 139',       // Deep Gray
    joyful: '248, 250, 252',    // Silver
    mysterious: '148, 163, 184',// Muted Slate
    neutral: '200, 200, 200'    // Gray
  };

  // Logic to define the 'White Space' of the article
  const detectSafeZones = (): SafeZone[] => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return [
      { x: 0, y: 0, width: w * 0.12, height: h },        // Left Margin
      { x: w * 0.88, y: 0, width: w * 0.12, height: h }, // Right Margin
      { x: 0, y: 0, width: w, height: h * 0.08 },        // Top Header
      { x: 0, y: h * 0.92, width: w, height: h * 0.08 }  // Footer
    ];
  };

  // Scroll Radar: Detects movement and notifies the system
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (Math.abs(currentScroll - lastScrollY.current) > scrollThreshold) {
        lastScrollY.current = currentScroll;
        const freshZones = detectSafeZones();
        setSafeZones(freshZones);
        if (onZonesUpdate) onZonesUpdate(freshZones, currentScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    setSafeZones(detectSafeZones());
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onZonesUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setSafeZones(detectSafeZones());
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Initialize particles specifically in Safe Zones
    if (particlesRef.current.length === 0) {
      const count = Math.floor(25 * intensity);
      particlesRef.current = Array.from({ length: count }, () => {
        const zone = safeZones[Math.floor(Math.random() * safeZones.length)];
        return {
          x: zone ? zone.x + Math.random() * zone.width : Math.random() * canvas.width,
          y: zone ? zone.y + Math.random() * zone.height : Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * intensity * 1.5,
          vy: (Math.random() - 0.5) * intensity * 1.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.4 + 0.1,
          phase: Math.random() * Math.PI * 2
        };
      });
    }

    let time = 0;
    const rgb = toneMap[emotion] || '255, 255, 255';

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      const motionEffects: Record<MotionType, (p: any, i: number) => void> = {
        breathe: (p) => {
          const breathe = Math.sin(time * 0.8 + p.phase) * intensity;
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity * (1 + breathe * 0.3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + breathe * 0.2), 0, Math.PI * 2);
          ctx.fill();
        },

        pulse: (p) => {
          const pulse = Math.abs(Math.sin(time * 2 + p.phase)) * intensity;
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity * (0.8 + pulse * 0.5)})`;
          ctx.shadowBlur = pulse * 15;
          ctx.shadowColor = `rgba(${rgb}, 0.5)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + pulse * 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        },

        wave: (p, i) => {
          const wave = Math.sin(time * 3 + i * 0.2) * intensity;
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y + (wave * 15), p.size, 0, Math.PI * 2);
          ctx.fill();
        },

        drift: (p) => {
          p.y += p.vy * 0.5;
          p.x += Math.sin(time + p.phase) * 0.5;
          // Loop particles back to screen
          if (p.y > canvas.height) p.y = 0;
          if (p.y < 0) p.y = canvas.height;
          
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        },

        shift: (p) => {
          p.x += p.vx * 0.8;
          p.y += p.vy * 0.8;

          // Stay in safe zones logic
          const inSafeZone = safeZones.some(zone =>
            p.x >= zone.x && p.x <= zone.x + zone.width &&
            p.y >= zone.y && p.y <= zone.y + zone.height
          );

          if (!inSafeZone || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            const zone = safeZones[Math.floor(Math.random() * safeZones.length)];
            p.x = zone.x + Math.random() * zone.width;
            p.y = zone.y + Math.random() * zone.height;
          }

          ctx.fillStyle = `rgba(${rgb}, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      particlesRef.current.forEach((p, i) => {
        motionEffects[motionType](p, i);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [motionType, intensity, emotion, isActive, safeZones]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-1000"
      style={{
        mixBlendMode: 'plus-lighter',
        opacity: 0.5,
        background: 'rgba(10, 10, 12, 0.15)' // The "Ideal" Opaque Layer
      }}
    />
  );
}

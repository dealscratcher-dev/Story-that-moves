import { useEffect, useRef, useState } from 'react';
import type { MotionType } from '../utils/narrativeAnalyzer';

interface OverlayMotionProps {
  motionType: MotionType;
  intensity: number;
  emotion: string;
  isActive: boolean;
}

interface SafeZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function OverlayMotion({ motionType, intensity, emotion, isActive }: OverlayMotionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    hue: number;
  }>>([]);

  const emotionColors: Record<string, number> = {
    calm: 200,
    tense: 0,
    exciting: 45,
    sad: 220,
    joyful: 120,
    mysterious: 280,
    neutral: 240
  };

  useEffect(() => {
    const detectSafeZones = () => {
      const zones: SafeZone[] = [];
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const leftMargin = { x: 0, y: 0, width: viewportWidth * 0.1, height: viewportHeight };
      const rightMargin = { x: viewportWidth * 0.9, y: 0, width: viewportWidth * 0.1, height: viewportHeight };
      const topMargin = { x: 0, y: 0, width: viewportWidth, height: viewportHeight * 0.08 };
      const bottomMargin = { x: 0, y: viewportHeight * 0.92, width: viewportWidth, height: viewportHeight * 0.08 };

      zones.push(leftMargin, rightMargin, topMargin, bottomMargin);

      return zones;
    };

    setSafeZones(detectSafeZones());

    const handleResize = () => {
      setSafeZones(detectSafeZones());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = Math.floor(20 * intensity);
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: particleCount }, () => {
        const zone = safeZones[Math.floor(Math.random() * safeZones.length)];
        return {
          x: zone ? zone.x + Math.random() * zone.width : Math.random() * canvas.width,
          y: zone ? zone.y + Math.random() * zone.height : Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * intensity * 0.5,
          vy: (Math.random() - 0.5) * intensity * 0.5,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.3 + 0.1,
          hue: emotionColors[emotion] || 240
        };
      });
    }

    let time = 0;

    const animate = () => {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      const motionEffects: Record<MotionType, () => void> = {
        breathe: () => {
          const breathe = Math.sin(time * 0.8) * intensity;
          particlesRef.current.forEach(particle => {
            const scale = 1 + breathe * 0.05;
            ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity * (1 + breathe * 0.2)})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * scale, 0, Math.PI * 2);
            ctx.fill();
          });
        },

        pulse: () => {
          const pulse = Math.abs(Math.sin(time * 2)) * intensity;
          particlesRef.current.forEach(particle => {
            ctx.fillStyle = `hsla(${particle.hue}, 70%, ${50 + pulse * 20}%, ${particle.opacity * (0.8 + pulse * 0.5)})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * (1 + pulse * 0.3), 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = pulse * 20;
            ctx.shadowColor = `hsl(${particle.hue}, 70%, 60%)`;
          });
          ctx.shadowBlur = 0;
        },

        wave: () => {
          particlesRef.current.forEach((particle, i) => {
            const wave = Math.sin(time * 3 + i * 0.5) * intensity;
            const offsetY = wave * 10;

            ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y + offsetY, particle.size, 0, Math.PI * 2);
            ctx.fill();
          });
        },

        drift: () => {
          particlesRef.current.forEach(particle => {
            particle.y += particle.vy * intensity * 0.3;
            particle.x += Math.sin(time + particle.y * 0.01) * 0.5;

            if (particle.y > canvas.height) particle.y = 0;
            if (particle.y < 0) particle.y = canvas.height;

            ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
          });
        },

        shift: () => {
          particlesRef.current.forEach(particle => {
            particle.x += particle.vx * intensity * 0.2;
            particle.y += particle.vy * intensity * 0.2;

            const inSafeZone = safeZones.some(zone =>
              particle.x >= zone.x && particle.x <= zone.x + zone.width &&
              particle.y >= zone.y && particle.y <= zone.y + zone.height
            );

            if (!inSafeZone || particle.x < 0 || particle.x > canvas.width || particle.y < 0 || particle.y > canvas.height) {
              const zone = safeZones[Math.floor(Math.random() * safeZones.length)];
              particle.x = zone.x + Math.random() * zone.width;
              particle.y = zone.y + Math.random() * zone.height;
            }

            ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      };

      motionEffects[motionType]();

      safeZones.forEach(zone => {
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [motionType, intensity, emotion, isActive, safeZones]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        mixBlendMode: 'screen',
        opacity: 0.6
      }}
    />
  );
}

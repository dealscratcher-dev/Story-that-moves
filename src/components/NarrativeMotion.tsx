import { useEffect, useRef } from 'react';
import type { MotionType } from '../utils/narrativeAnalyzer';

interface NarrativeMotionProps {
  children: React.ReactNode;
  motionType: MotionType;
  intensity: number;
  isActive: boolean;
}

export default function NarrativeMotion({ children, motionType, intensity, isActive }: NarrativeMotionProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current || !isActive) return;

    const element = elementRef.current;
    const baseIntensity = Math.max(0.3, intensity);

    let animationId: number;
    let startTime = performance.now();

    const animations: Record<MotionType, (time: number) => void> = {
      breathe: (time: number) => {
        const elapsed = (time - startTime) / 1000;
        const breathe = Math.sin(elapsed * 0.8) * baseIntensity;
        element.style.transform = `scale(${1 + breathe * 0.02})`;
        element.style.opacity = `${1 - Math.abs(breathe) * 0.05}`;
      },

      pulse: (time: number) => {
        const elapsed = (time - startTime) / 1000;
        const pulse = Math.abs(Math.sin(elapsed * 2)) * baseIntensity;
        element.style.transform = `scale(${1 + pulse * 0.04})`;
        element.style.filter = `brightness(${1 + pulse * 0.15})`;
      },

      shift: (time: number) => {
        const elapsed = (time - startTime) / 1000;
        const shiftX = Math.sin(elapsed * 1.2) * baseIntensity * 3;
        const shiftY = Math.cos(elapsed * 0.9) * baseIntensity * 2;
        element.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
      },

      wave: (time: number) => {
        const elapsed = (time - startTime) / 1000;
        const wave = Math.sin(elapsed * 3) * baseIntensity;
        element.style.transform = `translateY(${wave * 5}px) rotate(${wave * 0.5}deg)`;
        element.style.filter = `brightness(${1 + Math.abs(wave) * 0.2})`;
      },

      drift: (time: number) => {
        const elapsed = (time - startTime) / 1000;
        const drift = Math.sin(elapsed * 0.5) * baseIntensity;
        element.style.transform = `translateY(${drift * 8}px)`;
        element.style.opacity = `${1 - Math.abs(drift) * 0.15}`;
      }
    };

    const animate = (time: number) => {
      animations[motionType](time);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      element.style.transform = '';
      element.style.opacity = '';
      element.style.filter = '';
    };
  }, [motionType, intensity, isActive]);

  return (
    <div
      ref={elementRef}
      className="transition-all duration-150"
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </div>
  );
}

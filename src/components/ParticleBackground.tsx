import { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  emotion: string;
  intensity: number;
}

export default function ParticleBackground({ emotion, intensity }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    const emotionColors: Record<string, string[]> = {
      calm: ['rgba(59, 130, 246, ', 'rgba(96, 165, 250, '],
      tense: ['rgba(239, 68, 68, ', 'rgba(251, 146, 60, '],
      exciting: ['rgba(234, 179, 8, ', 'rgba(250, 204, 21, '],
      sad: ['rgba(148, 163, 184, ', 'rgba(203, 213, 225, '],
      joyful: ['rgba(34, 197, 94, ', 'rgba(74, 222, 128, '],
      mysterious: ['rgba(168, 85, 247, ', 'rgba(192, 132, 252, '],
      neutral: ['rgba(100, 116, 139, ', 'rgba(148, 163, 184, ']
    };

    const colors = emotionColors[emotion] || emotionColors.neutral;
    const particleCount = Math.floor(30 + intensity * 50);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * (0.5 + intensity),
        vy: (Math.random() - 0.5) * (0.5 + intensity),
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.3
      });
    }

    let animationId: number;

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        const color = colors[index % colors.length];
        ctx.fillStyle = `${color}${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        particles.forEach((otherParticle, otherIndex) => {
          if (index === otherIndex) return;

          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.strokeStyle = `${color}${0.1 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [emotion, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}

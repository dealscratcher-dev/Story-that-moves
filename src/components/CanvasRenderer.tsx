import { useEffect, useRef } from 'react';

// --- STANDALONE TYPES ---
export interface Entity {
  id: string;
  label: string;
  position: { x: number; y: number };
  size?: number;
  state?: {
    action?: string;
    cue?: string;
  };
}

export interface NarrativeFrame {
  id: string;
  duration?: number;
  emotion: { primary: string; intensity: number };
  entities: Entity[];
  motionPaths: { entityId: string; keyframes: { x: number; y: number }[] }[];
  styleDNA: {
    motionEase: string;
    colors: {
      background: string;
      primary: string;
      accent: string;
    };
  };
}

// --- MOTION UTILS ---
const Easing = {
  linear: (t: number) => t,
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

const getQuadraticBezier = (t: number, p0: {x: number, y: number}, p2: {x: number, y: number}, control: {x: number, y: number}) => {
  const invT = 1 - t;
  return {
    x: invT * invT * p0.x + 2 * invT * t * control.x + t * t * p2.x,
    y: invT * invT * p0.y + 2 * invT * t * control.y + t * t * p2.y
  };
};

const applyEmotionalJitter = (pos: {x: number, y: number}, intensity: number, time: number) => {
  if (!intensity || intensity < 0.2) return pos;
  const jitter = Math.sin(time * 0.1) * (intensity * 5);
  return { x: pos.x + jitter, y: pos.y + jitter };
};

// --- MEMORY BANK ---
const historyCache: Record<string, {x: number, y: number}[]> = {};
const localMemoryBank = {
  updateTrajectory: (entity: Entity) => {
    if (!historyCache[entity.id]) historyCache[entity.id] = [];
    historyCache[entity.id].push({ ...entity.position });
    if (historyCache[entity.id].length > 20) historyCache[entity.id].shift();
  },
  getHistory: (id: string) => historyCache[id] || []
};

interface CanvasRendererProps {
  frames: NarrativeFrame[];
  currentFrameIndex: number;
  onFrameComplete?: () => void;
}

export function CanvasRenderer({
  frames,
  currentFrameIndex,
  onFrameComplete,
}: CanvasRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    // CRITICAL: Stop the render if data is corrupted or missing
    if (!canvas || !frames || !frames[currentFrameIndex]) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const currentFrame = frames[currentFrameIndex];
    const startTime = performance.now();
    const duration = currentFrame.duration || 4000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // FIX: The "e is not a function" patch
      const easeKey = currentFrame?.styleDNA?.motionEase as keyof typeof Easing;
      const easeFn = Easing[easeKey] || Easing.linear;
      const easedProgress = easeFn(progress);

      // Stage Setup
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = currentFrame?.styleDNA?.colors?.background || '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      if (currentFrame.entities) {
        currentFrame.entities.forEach((entity) => {
          const path = currentFrame.motionPaths?.find(p => p.entityId === entity.id);
          let { x, y } = entity.position || { x: 0, y: 0 };

          if (path && path.keyframes && path.keyframes.length >= 2) {
            const p0 = path.keyframes[0];
            const p2 = path.keyframes[path.keyframes.length - 1];
            const curveOffset = 150 * (currentFrame.emotion?.intensity || 0);
            const control = { 
              x: (p0.x + p2.x) / 2 + curveOffset, 
              y: (p0.y + p2.y) / 2 - curveOffset 
            };
            const pos = getQuadraticBezier(easedProgress, p0, p2, control);
            x = pos.x;
            y = pos.y;
          }

          const jitteredPos = applyEmotionalJitter({ x, y }, currentFrame.emotion?.intensity || 0, currentTime);
          localMemoryBank.updateTrajectory({ ...entity, position: jitteredPos });
          
          const history = localMemoryBank.getHistory(entity.id);
          const primaryColor = currentFrame.styleDNA?.colors?.primary || '#3b82f6';

          drawTrail(ctx, history, primaryColor);
          drawVisualEntity(ctx, entity, jitteredPos.x, jitteredPos.y, currentFrame);
        });
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        onFrameComplete?.();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentFrameIndex, frames]);

  // --- HELPERS ---
  const drawTrail = (ctx: CanvasRenderingContext2D, points: {x: number, y: number}[], color: string) => {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 8]); 
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  };

  const drawVisualEntity = (ctx: CanvasRenderingContext2D, entity: Entity, x: number, y: number, frame: NarrativeFrame) => {
    const size = entity.size || 25;
    const moodIntensity = frame.emotion?.intensity || 0.5;
    const action = entity.state?.action || 'default';

    ctx.save();
    ctx.shadowBlur = 20 * moodIntensity;
    ctx.shadowColor = frame.styleDNA?.colors?.accent || '#ffffff';
    ctx.fillStyle = frame.styleDNA?.colors?.primary || '#3b82f6';

    ctx.beginPath();
    if (action === 'expand' || action === 'pulse') {
      const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.15;
      ctx.arc(x, y, size * pulseScale, 0, Math.PI * 2);
    } else if (action === 'upend' || action === 'anger') {
      ctx.rect(x - size, y - size, size * 2, size * 2);
    } else {
      ctx.arc(x, y, size, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((entity.label || 'Entity').toUpperCase(), x, y + size + 20);
    ctx.restore();
  };

  return (
    <div className="relative w-full h-full bg-transparent">
      <canvas ref={canvasRef} width={2000} height={1200} className="w-full h-full object-contain pointer-events-none" />
    </div>
  );
}

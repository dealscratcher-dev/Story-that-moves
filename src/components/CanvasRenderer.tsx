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
  sequence: number;
  description: string;
  action_beats: any[];
  layout_hints: { x: number; y: number; label: string }[];
  emotion_curve: { primary: string; intensity: number; valence: number };
  motion_ease: string;
  duration: number;
  style_dna: {
    colors: { primary: string; secondary: string; accent: string; background?: string };
    motionEase: string;
    particle_count: number;
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

const applyEmotionalJitter = (pos: {x: number, y: number}, intensity: number, time: number) => {
  if (!intensity || intensity < 0.2) return pos;
  const jitter = Math.sin(time * 0.1) * (intensity * 15); 
  return { x: pos.x + jitter, y: pos.y + jitter };
};

// --- MEMORY BANK ---
const historyCache: Record<string, {x: number, y: number}[]> = {};
let lastPersistenceTime = 0;

const localMemoryBank = {
  updateTrajectory: (id: string, pos: {x: number, y: number}) => {
    if (!historyCache[id]) historyCache[id] = [];
    historyCache[id].push({ ...pos });
    if (historyCache[id].length > 25) historyCache[id].shift();

    const now = Date.now();
    if (now - lastPersistenceTime > 2000) {
      lastPersistenceTime = now;
    }
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
    if (!canvas || !frames || !frames[currentFrameIndex]) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const currentFrame = frames[currentFrameIndex];
    const startTime = performance.now();
    const duration = currentFrame.duration || 4500;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeKey = (currentFrame.motion_ease || currentFrame.style_dna?.motionEase) as keyof typeof Easing;
      const easeFn = Easing[easeKey] || Easing.linear;
      const easedProgress = easeFn(progress);

      // Clean Stage Background
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = currentFrame.style_dna?.colors?.background || '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      if (currentFrame.action_beats && Array.isArray(currentFrame.action_beats)) {
        currentFrame.action_beats.forEach((beat, index) => {
          const hint = currentFrame.layout_hints[index] || { x: 0.5, y: 0.5 };
          
          const targetX = hint.x * 2000;
          const targetY = hint.y * 1200;
          
          const x = 1000 + (targetX - 1000) * easedProgress;
          const y = 600 + (targetY - 600) * easedProgress;

          const jitteredPos = applyEmotionalJitter({ x, y }, currentFrame.emotion_curve?.intensity || 0, currentTime);
          const entityId = `beat-${index}-${currentFrame.sequence}`;
          
          localMemoryBank.updateTrajectory(entityId, jitteredPos);
          const history = localMemoryBank.getHistory(entityId);
          const primaryColor = currentFrame.style_dna?.colors?.primary || '#3b82f6';

          drawTrail(ctx, history, primaryColor);
          drawVisualEntity(ctx, beat.entity, beat.action, jitteredPos.x, jitteredPos.y, currentFrame);
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
  }, [currentFrameIndex, frames, onFrameComplete]);

  // --- HELPERS ---

  const drawTrail = (ctx: CanvasRenderingContext2D, points: {x: number, y: number}[], color: string) => {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 12]); 
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  };

  const drawVisualEntity = (ctx: CanvasRenderingContext2D, label: string, action: string, x: number, y: number, frame: NarrativeFrame) => {
    const moodIntensity = frame.emotion_curve?.intensity || 0.5;
    const color = frame.style_dna?.colors?.accent || '#3b82f6';
    
    ctx.save();
    
    // Aesthetic Glow
    ctx.shadowBlur = 30 * moodIntensity;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    // Pulse calculation
    const pulse = 1 + Math.sin(Date.now() / 250) * (0.1 * moodIntensity);
    const size = 30 * pulse;

    // --- GEOMETRIC RENDERING ---
    if (action === 'write' || action === 'revise') {
      // Angular "Working" State
      ctx.translate(x, y);
      ctx.rotate(Date.now() * 0.002);
      ctx.fillRect(-size/2, -size/2, size, size);
    } else {
      // Circular "Being" State
      ctx.beginPath();
      ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dynamic Labeling
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.9;
    ctx.fillText(label.toUpperCase(), x, y + 55);
    ctx.restore();
  };

  return (
    <div className="relative w-full h-full bg-transparent">
      <canvas 
        ref={canvasRef} 
        width={2000} 
        height={1200} 
        className="w-full h-full object-contain pointer-events-none" 
      />
    </div>
  );
}

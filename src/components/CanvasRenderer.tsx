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

// Updated to reflect the actual MongoDB structure provided
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
  const jitter = Math.sin(time * 0.1) * (intensity * 15); // Increased for visibility
  return { x: pos.x + jitter, y: pos.y + jitter };
};

// --- MEMORY BANK ---
const historyCache: Record<string, {x: number, y: number}[]> = {};
const localMemoryBank = {
  updateTrajectory: (id: string, pos: {x: number, y: number}) => {
    if (!historyCache[id]) historyCache[id] = [];
    historyCache[id].push({ ...pos });
    if (historyCache[id].length > 25) historyCache[id].shift();
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
      
      // Safety lookup for Easing function
      const easeKey = (currentFrame.motion_ease || currentFrame.style_dna?.motionEase) as keyof typeof Easing;
      const easeFn = Easing[easeKey] || Easing.linear;
      const easedProgress = easeFn(progress);

      // Stage Setup
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = currentFrame.style_dna?.colors?.background || '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      // Translate action_beats and layout_hints into visual motion
      if (currentFrame.action_beats && Array.isArray(currentFrame.action_beats)) {
        currentFrame.action_beats.forEach((beat, index) => {
          const hint = currentFrame.layout_hints[index] || { x: 0.5, y: 0.5 };
          
          // Map 0.0-1.0 coordinate system to 2000x1200 canvas
          const targetX = hint.x * 2000;
          const targetY = hint.y * 1200;
          
          // Simple interpolation from a center start point
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
    ctx.setLineDash([5, 15]); 
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  };

  const drawVisualEntity = (ctx: CanvasRenderingContext2D, label: string, action: string, x: number, y: number, frame: NarrativeFrame) => {
    const size = 30;
    const moodIntensity = frame.emotion_curve?.intensity || 0.5;

    ctx.save();
    ctx.shadowBlur = 30 * moodIntensity;
    ctx.shadowColor = frame.style_dna?.colors?.accent || '#ffffff';
    ctx.fillStyle = frame.style_dna?.colors?.primary || '#3b82f6';

    ctx.beginPath();
    // Visual polymorphism based on the "action"
    if (action === 'write' || action === 'revise') {
      const pulse = 1 + Math.sin(Date.now() / 150) * 0.2;
      ctx.arc(x, y, size * pulse, 0, Math.PI * 2);
    } else if (action === 'anger' || action === 'severe') {
      ctx.rect(x - size, y - size, size * 2, size * 2);
    } else {
      ctx.arc(x, y, size, 0, Math.PI * 2);
    }
    ctx.fill();

    // Label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), x, y + size + 25);
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

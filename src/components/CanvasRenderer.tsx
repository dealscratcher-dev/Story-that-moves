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

// Updated to match your actual MongoDB "Good Taste" / Paul Graham data structure
export interface NarrativeFrame {
  sequence: number;
  description: string;
  action_beats: any[];
  layout_hints: { x: number; y: number; label: string }[];
  emotion_curve: { primary: string; intensity: number; valence: number };
  motion_ease?: string; // MongoDB top-level key
  duration: number;
  style_dna: {
    colors: { primary: string; secondary: string; accent: string; background?: string };
    motionEase?: string; // Pydantic/Frontend key
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
  // Intensity-based shake
  const shake = Math.sin(time * 0.01) * (intensity * 12);
  return { x: pos.x + shake, y: pos.y + shake };
};

// --- MEMORY BANK ---
const historyCache: Record<string, {x: number, y: number}[]> = {};
const updateTrajectory = (id: string, pos: {x: number, y: number}) => {
  if (!historyCache[id]) historyCache[id] = [];
  historyCache[id].push({ ...pos });
  if (historyCache[id].length > 20) historyCache[id].shift();
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
      
      /** * 🛡️ DEFENSIVE EASING LOOKUP
       * This prevents "e is not a function" by verifying the string exists in Easing map.
       */
      const rawEaseKey = (currentFrame.motion_ease || currentFrame.style_dna?.motionEase || 'linear') as string;
      
      const easeFn = (rawEaseKey in Easing && typeof Easing[rawEaseKey as keyof typeof Easing] === 'function')
        ? Easing[rawEaseKey as keyof typeof Easing]
        : (() => {
            console.warn(`Invalid easing key: "${rawEaseKey}". Falling back to linear.`);
            return Easing.linear;
          })();

      const easedProgress = easeFn(progress);

      // --- STAGE SETUP ---
      // Paint background with trail persistence
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = currentFrame.style_dna?.colors?.background || '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      // --- DATA TRANSLATION LOOP ---
      // We map MongoDB "action_beats" and "layout_hints" to the Canvas
      if (currentFrame.action_beats && Array.isArray(currentFrame.action_beats)) {
        currentFrame.action_beats.forEach((beat, index) => {
          // Get target position from hints, or default to center
          const hint = currentFrame.layout_hints[index] || { x: 0.5, y: 0.5 };
          
          // Map 0.0-1.0 coords to our 2000x1200 high-res stage
          const targetX = hint.x * 2000;
          const targetY = hint.y * 1200;
          
          // Animate movement from center (1000, 600) to the target hint
          const x = 1000 + (targetX - 1000) * easedProgress;
          const y = 600 + (targetY - 600) * easedProgress;

          const jitteredPos = applyEmotionalJitter({ x, y }, currentFrame.emotion_curve?.intensity || 0, currentTime);
          const entityId = `beat-${index}-${currentFrame.sequence}`;
          
          updateTrajectory(entityId, jitteredPos);
          const history = historyCache[entityId] || [];
          const primaryColor = currentFrame.style_dna?.colors?.primary || '#3b82f6';

          // Draw visual layers
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
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  };

  const drawVisualEntity = (ctx: CanvasRenderingContext2D, label: string, action: string, x: number, y: number, frame: NarrativeFrame) => {
    const size = 35;
    const moodIntensity = frame.emotion_curve?.intensity || 0.5;

    ctx.save();
    ctx.shadowBlur = 25 * moodIntensity;
    ctx.shadowColor = frame.style_dna?.colors?.accent || '#ffffff';
    ctx.fillStyle = frame.style_dna?.colors?.primary || '#3b82f6';

    ctx.beginPath();
    // Logic-driven shapes based on AI "action"
    if (action === 'write' || action === 'think' || action === 'reflect') {
      const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
      ctx.arc(x, y, size * pulse, 0, Math.PI * 2);
    } else if (action === 'severe' || action === 'anger' || action === 'test') {
      ctx.rect(x - size, y - size, size * 2, size * 2);
    } else {
      ctx.arc(x, y, size, 0, Math.PI * 2);
    }
    ctx.fill();

    // Entity Label Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), x, y + size + 30);
    ctx.restore();
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={2000} 
        height={1200} 
        className="w-full h-full object-contain pointer-events-none" 
      />
    </div>
  );
}

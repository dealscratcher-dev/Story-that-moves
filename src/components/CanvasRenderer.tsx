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
  // Supports both Mongo "action_beats" and Original "entities"
  sequence?: number;
  action_beats?: any[];
  layout_hints?: { x: number; y: number; label: string }[];
  emotion_curve?: { primary: string; intensity: number; valence: number };
  
  // Original Structure Fallbacks
  id?: string;
  duration?: number;
  emotion?: { primary: string; intensity: number };
  entities?: Entity[];
  motionPaths?: { entityId: string; keyframes: { x: number; y: number }[] }[];
  
  motion_ease?: string;
  style_dna?: {
    colors: { background?: string; primary: string; secondary?: string; accent: string };
    motionEase?: string;
  };
  // Legacy support for camelCase
  styleDNA?: {
    motionEase: string;
    colors: { background: string; primary: string; accent: string };
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
  if (!intensity || intensity < 0.1) return pos;
  const jitter = Math.sin(time * 0.01) * (intensity * 15);
  return { x: pos.x + jitter, y: pos.y + jitter };
};

// --- GLOBAL MEMORY FOR TRAILS ---
const historyCache: Record<string, {x: number, y: number}[]> = {};

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
      
      // 1. SAFE EASING LOOKUP
      const rawEaseKey = (
        currentFrame.motion_ease || 
        currentFrame.style_dna?.motionEase || 
        currentFrame.styleDNA?.motionEase || 
        'linear'
      ) as keyof typeof Easing;
      
      const easeFn = Easing[rawEaseKey] || Easing.linear;
      const easedProgress = easeFn(progress);

      // 2. STAGE SETUP
      const colors = currentFrame.style_dna?.colors || currentFrame.styleDNA?.colors;
      ctx.globalAlpha = 0.2; // Keep for trail persistence
      ctx.fillStyle = colors?.background || '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      // 3. AGGRESSIVE DATA EXTRACTION
      const beats = currentFrame.action_beats || currentFrame.entities || [];
      const hints = currentFrame.layout_hints || [];
      const intensity = currentFrame.emotion_curve?.intensity || currentFrame.emotion?.intensity || 0.5;

      if (beats.length === 0) {
        // VISUAL DEBUGGER FOR EMPTY DATA
        ctx.fillStyle = "#ffffff";
        ctx.font = "30px Inter";
        ctx.textAlign = "center";
        ctx.fillText("FRAME LOADED: SEARCHING FOR BEATS...", 1000, 600);
      }

      beats.forEach((item: any, index: number) => {
        // Determine Position
        let x, y;
        
        // If it's the Mongo Structure (action_beats + layout_hints)
        if (currentFrame.layout_hints) {
          const hint = hints[index] || { x: 0.5, y: 0.5 };
          const targetX = (hint.x || 0.5) * 2000;
          const targetY = (hint.y || 0.5) * 1200;
          // Animate from center
          x = 1000 + (targetX - 1000) * easedProgress;
          y = 600 + (targetY - 600) * easedProgress;
        } 
        // If it's the original Entity structure
        else {
          x = item.position?.x || 1000;
          y = item.position?.y || 600;
        }

        const jitteredPos = applyEmotionalJitter({ x, y }, intensity, currentTime);
        const entityId = `entity-${index}-${currentFrameIndex}`;

        // Update Trails
        if (!historyCache[entityId]) historyCache[entityId] = [];
        historyCache[entityId].push(jitteredPos);
        if (historyCache[entityId].length > 25) historyCache[entityId].shift();

        // DRAW
        const primary = colors?.primary || '#3b82f6';
        const accent = colors?.accent || '#ffffff';
        
        // Trail
        drawTrail(ctx, historyCache[entityId], primary);

        // Entity Shape
        const action = item.action || item.state?.action || 'default';
        const label = item.entity || item.label || 'Entity';
        
        ctx.save();
        ctx.shadowBlur = 40 * intensity;
        ctx.shadowColor = accent;
        ctx.fillStyle = primary;
        ctx.beginPath();
        
        if (['write', 'think', 'reflect'].includes(action)) {
          ctx.arc(jitteredPos.x, jitteredPos.y, 45, 0, Math.PI * 2);
        } else {
          ctx.rect(jitteredPos.x - 40, jitteredPos.y - 40, 80, 80);
        }
        ctx.fill();

        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label.toUpperCase(), jitteredPos.x, jitteredPos.y + 100);
        ctx.restore();
      });

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

  const drawTrail = (ctx: CanvasRenderingContext2D, points: {x: number, y: number}[], color: string) => {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.setLineDash([8, 16]);
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.4;
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={2000} 
        height={1200} 
        className="w-full h-full object-contain pointer-events-none" 
      />
    </div>
  );
}

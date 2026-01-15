import { useEffect, useRef } from 'react';
import type { NarrativeFrame, Entity } from '../types/narrative';
import { Easing, getQuadraticBezier, applyEmotionalJitter } from '../lib/motionLogic';
import { memoryBank } from '../services/memoryBank';

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
    if (!canvas || !frames[currentFrameIndex]) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Performance optimization
    if (!ctx) return;

    const currentFrame = frames[currentFrameIndex];
    const startTime = performance.now();
    const duration = currentFrame.duration || 4000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply Easing from StyleDNA (mapped to Easing lib)
      const easeKey = currentFrame.styleDNA.motionEase as keyof typeof Easing;
      const easedProgress = Easing[easeKey]?.(progress) ?? progress;

      // --- STAGE SETUP ---
      // Cinematic organic trails: we don't clear, we layer the background with low opacity
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = currentFrame.styleDNA.colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      // --- RENDER ENTITIES ---
      currentFrame.entities.forEach((entity) => {
        const path = currentFrame.motionPaths.find(p => p.entityId === entity.id);
        let { x, y } = entity.position;

        // Calculate Position via Bezier Path
        if (path && path.keyframes.length >= 2) {
          const p0 = path.keyframes[0];
          const p2 = path.keyframes[path.keyframes.length - 1];
          
          // Emotional Curve logic: "High intensity" creates sharper/wider curves
          const curveOffset = 150 * currentFrame.emotion.intensity;
          const control = { 
            x: (p0.x + p2.x) / 2 + curveOffset, 
            y: (p0.y + p2.y) / 2 - curveOffset 
          };
          
          const pos = getQuadraticBezier(easedProgress, p0, p2, control);
          x = pos.x;
          y = pos.y;
        }

        // Apply Micro-interactions (Jitter/Vibration)
        const jitteredPos = applyEmotionalJitter(
          { x, y }, 
          currentFrame.emotion.intensity, 
          currentTime
        );

        // Update persistence in MemoryBank
        memoryBank.updateTrajectory({ ...entity, position: jitteredPos }, currentFrame.id);
        
        // Render persistence (Trails)
        const history = memoryBank.getHistory(entity.id);
        drawTrail(ctx, history, currentFrame.styleDNA.colors.primary);

        // Render the physical Entity
        drawVisualEntity(ctx, entity, jitteredPos.x, jitteredPos.y, currentFrame);
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
  }, [currentFrameIndex, frames]);

  // --- RENDERING HELPERS ---

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

  const drawVisualEntity = (
    ctx: CanvasRenderingContext2D, 
    entity: Entity, 
    x: number, 
    y: number, 
    frame: NarrativeFrame
  ) => {
    const size = entity.size || 25;
    const moodIntensity = frame.emotion.intensity;
    const action = entity.state?.action as string;

    ctx.save();
    
    // Style from DNA + Action Logic
    ctx.shadowBlur = 20 * moodIntensity;
    ctx.shadowColor = frame.styleDNA.colors.accent;
    ctx.fillStyle = frame.styleDNA.colors.primary;

    // Entity Body
    ctx.beginPath();
    
    // Switch shape/behavior based on backend "action"
    if (action === 'expand' || action === 'pulse') {
      const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.15;
      ctx.arc(x, y, size * pulseScale, 0, Math.PI * 2);
    } else if (action === 'upend' || action === 'anger') {
      // Draw a more "jagged" or square shape for aggressive actions
      ctx.rect(x - size, y - size, size * 2, size * 2);
    } else {
      ctx.arc(x, y, size, 0, Math.PI * 2);
    }
    
    ctx.fill();

    // Text Overlay (Character Name)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0; // Don't glow the text
    ctx.fillText(entity.label.toUpperCase(), x, y + size + 20);

    // Visual Cue (The "What is happening" text from Railway)
    if (entity.state?.cue) {
      ctx.font = '500 10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(entity.state.cue as string, x, y + size + 35);
    }

    ctx.restore();
  };

  return (
    <div className="relative w-full h-[600px] bg-[#020617] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
      <canvas 
        ref={canvasRef} 
        width={1200} 
        height={800} 
        className="w-full h-full object-cover" 
      />
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
            Current Phase
          </span>
          <span className="text-white font-medium">
            {frames[currentFrameIndex]?.emotion.primary}
          </span>
        </div>
      </div>

      <div className="absolute bottom-6 right-8">
         <div className="flex items-center gap-2">
            <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500" 
                  style={{ width: `${(currentFrameIndex + 1) / frames.length * 100}%` }}
                />
            </div>
            <span className="text-[10px] font-mono text-white/30">
              {currentFrameIndex + 1} / {frames.length}
            </span>
         </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { StoryboardScene } from '../types/storyboard';

interface SceneOverlayProps {
  scene: StoryboardScene | null;
  isActive: boolean;
}

const POSITION_CLASSES = {
  left: 'left-8 top-1/2 -translate-y-1/2',
  right: 'right-8 top-1/2 -translate-y-1/2',
  center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-left': 'left-8 top-8',
  'top-right': 'right-8 top-8',
  'bottom-left': 'left-8 bottom-8',
  'bottom-right': 'right-8 bottom-8',
};

const ANIMATION_CLASSES = {
  fadeSlideIn: 'animate-fadeSlideIn',
  scaleIn: 'animate-scaleIn',
  bounceIn: 'animate-bounceIn',
  slideUp: 'animate-slideUp',
  ripple: 'animate-ripple',
};

const TYPE_ICONS = {
  character: '👤',
  location: '📍',
  object: '🔷',
  emotion: '💭',
  action: '⚡',
};

const TYPE_COLORS = {
  character: 'from-blue-500/90 to-cyan-500/90',
  location: 'from-green-500/90 to-emerald-500/90',
  object: 'from-amber-500/90 to-orange-500/90',
  emotion: 'from-purple-500/90 to-pink-500/90',
  action: 'from-red-500/90 to-rose-500/90',
};

export default function SceneOverlay({ scene, isActive }: SceneOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive && scene) {
      setMounted(true);
      setTimeout(() => setVisible(true), 50);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive, scene]);

  if (!mounted || !scene) return null;

  const positionClass = POSITION_CLASSES[scene.position];
  const animationClass = ANIMATION_CLASSES[scene.animation];
  const typeIcon = TYPE_ICONS[scene.type];
  const typeColor = TYPE_COLORS[scene.type];

  return (
    <div
      className={`fixed ${positionClass} transition-all duration-500 z-50 pointer-events-none ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div
        className={`${animationClass} max-w-sm bg-gradient-to-br ${typeColor} backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden`}
        style={{
          animation: visible ? undefined : 'none',
        }}
      >
        <div className="p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-3xl flex-shrink-0">{typeIcon}</div>
            <div className="flex-1 min-w-0">
              {scene.name && (
                <h3 className="text-xl font-bold text-white mb-1 truncate">
                  {scene.name}
                </h3>
              )}
              <p className="text-sm text-white/90 leading-relaxed">
                {scene.content}
              </p>
            </div>
          </div>

          {scene.textSegment && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs text-white/70 italic line-clamp-2">
                "{scene.textSegment}"
              </p>
            </div>
          )}
        </div>

        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/40 via-white/60 to-white/40" />
      </div>
    </div>
  );
}

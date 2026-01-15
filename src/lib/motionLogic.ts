/**
 * StitchQylt Motion & Physics Engine
 * Handles interpolation, easing, and emotional vibration logic.
 */

export interface Point {
  x: number;
  y: number;
}

// 1. EASING FUNCTIONS
// These transform linear time (0-1) into "natural" time.
export const Easing = {
  linear: (t: number) => t,
  
  // Smooth start and end
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  
  // Dramatic acceleration (Climax/Action)
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  
  // Bouncy (Joy/Surprise)
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

// 2. PATH INTERPOLATION (The "PathFinder" Successor)
// Uses Linear Interpolation (LERP) for basic movement
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

// 3. EMOTIONAL JITTER (Micro-movements)
// Adds high-frequency noise to simulate anxiety, anger, or excitement
export const applyEmotionalJitter = (
  position: Point, 
  intensity: number, 
  time: number
): Point => {
  if (intensity < 0.2) return position;

  // Use sine waves with different frequencies for "organic" chaos
  const drift = intensity * 5;
  return {
    x: position.x + Math.sin(time * 0.01) * Math.cos(time * 0.007) * drift,
    y: position.y + Math.cos(time * 0.009) * Math.sin(time * 0.005) * drift
  };
};

// 4. BEZIER CURVE CALCULATION
// Transforms 2 points and a "pull" (from emotion) into a curve
export const getQuadraticBezier = (
  t: number, 
  p0: Point, 
  p1: Point, 
  control: Point
): Point => {
  const invT = 1 - t;
  return {
    x: Math.pow(invT, 2) * p0.x + 2 * invT * t * control.x + Math.pow(t, 2) * p1.x,
    y: Math.pow(invT, 2) * p0.y + 2 * invT * t * control.y + Math.pow(t, 2) * p1.y
  };
};

// 5. VELOCITY TRACKER
// Helps the MemoryBank calculate where an entity is likely to be next
export const calculateVelocity = (
  current: Point, 
  previous: Point, 
  dt: number
): { vx: number; vy: number } => {
  return {
    vx: (current.x - previous.x) / dt,
    vy: (current.y - previous.y) / dt
  };
};

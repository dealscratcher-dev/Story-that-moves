export interface Point {
  x: number;
  y: number;
}

export interface PathState extends Point {
  angle: number; // The heading/direction in radians
}

export const pathFinder = {
  /**
   * Calculates a point AND the heading (angle) on a Catmull-Rom spline.
   * Useful for making entities "face" where they are walking.
   */
  getPointOnPath(points: Point[], t: number): PathState {
    if (!points || !Array.isArray(points) || points.length === 0) {
      return { x: 0.5, y: 0.5, angle: 0 };
    }
    
    const validPoints = points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
    
    if (validPoints.length === 0) return { x: 0.5, y: 0.5, angle: 0 };
    if (validPoints.length === 1) return { x: validPoints[0].x, y: validPoints[0].y, angle: 0 };

    const clampedT = Math.max(0, Math.min(1, t));
    const n = validPoints.length - 1;
    const rawIndex = clampedT * n;
    const i = Math.min(Math.floor(rawIndex), n - 1);
    const localT = rawIndex - i;

    const p0 = validPoints[Math.max(i - 1, 0)];
    const p1 = validPoints[i];
    const p2 = validPoints[i + 1];
    const p3 = validPoints[Math.min(i + 2, n)];

    const calculateCoord = (c0: number, c1: number, c2: number, c3: number, T: number) => {
      return 0.5 * (
        (2 * c1) +
        (-c0 + c2) * T +
        (2 * c0 - 5 * c1 + 4 * c2 - c3) * T * T +
        (-c0 + 3 * c1 - 3 * c2 + c3) * T * T * T
      );
    };

    // Calculate position
    const x = calculateCoord(p0.x, p1.x, p2.x, p3.x, localT);
    const y = calculateCoord(p0.y, p1.y, p2.y, p3.y, localT);

    // --- NEW: Direction Calculation ---
    // Look slightly ahead to find the angle of movement
    const lookAheadT = Math.min(1, clampedT + 0.01);
    const aheadX = calculateCoord(p0.x, p1.x, p2.x, p3.x, localT + 0.01);
    const aheadY = calculateCoord(p0.y, p1.y, p2.y, p3.y, localT + 0.01);
    const angle = Math.atan2(aheadY - y, aheadX - x);

    return {
      x: Math.max(0, Math.min(1, isNaN(x) ? 0.5 : x)),
      y: Math.max(0, Math.min(1, isNaN(y) ? 0.5 : y)),
      angle: isNaN(angle) ? 0 : angle
    };
  },

  /**
   * Proximity Check: Tells the engine if two entities have "met" 
   * (e.g., Man is close enough to Slay the Dragon)
   */
  checkCollision(p1: Point, p2: Point, threshold: number = 0.05): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  },

  generatePathPoints(hints: Point[], resolution: number = 100): Point[] {
    if (!hints || hints.length === 0) return [];
    const path: Point[] = [];
    for (let i = 0; i <= resolution; i++) {
      const state = this.getPointOnPath(hints, i / resolution);
      path.push({ x: state.x, y: state.y });
    }
    return path;
  }
};

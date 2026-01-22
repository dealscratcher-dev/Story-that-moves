export interface Point {
  x: number;
  y: number;
}

export const pathFinder = {
  getPointOnPath(points: Point[], t: number): Point {
    if (!points || !Array.isArray(points) || points.length === 0) {
      return { x: 0.5, y: 0.5 };
    }
    
    const validPoints = points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
    
    if (validPoints.length === 0) return { x: 0.5, y: 0.5 };
    if (validPoints.length === 1) return { x: validPoints[0].x, y: validPoints[0].y };

    // Ensure t is clamped between 0 and 1 to prevent array index errors
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

    const result = {
      x: calculateCoord(p0.x, p1.x, p2.x, p3.x, localT),
      y: calculateCoord(p0.y, p1.y, p2.y, p3.y, localT)
    };

    // NEW: Clamp results to [0, 1] so the emoji doesn't "jump" off the canvas edge
    return {
      x: Math.max(0, Math.min(1, isNaN(result.x) ? 0.5 : result.x)),
      y: Math.max(0, Math.min(1, isNaN(result.y) ? 0.5 : result.y))
    };
  },

  /**
   * Generates a "Guide Line" with higher default resolution
   */
  generatePathPoints(hints: Point[], resolution: number = 100): Point[] {
    if (!hints || hints.length === 0) return [];
    const path: Point[] = [];
    for (let i = 0; i <= resolution; i++) {
      path.push(this.getPointOnPath(hints, i / resolution));
    }
    return path;
  }
};

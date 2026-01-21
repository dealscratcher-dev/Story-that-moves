/**
 * PathFinder Logic for Narrative White-Space Navigation
 * Takes normalized coordinates (0-1) from MongoDB layout_hints 
 * and calculates a smooth, continuous curve.
 */

export interface Point {
  x: number;
  y: number;
}

export const pathFinder = {
  /**
   * Calculates a point on a Catmull-Rom spline.
   * @param points - Array of layout hints {x, y}
   * @param t - Progress along the path (0.0 to 1.0)
   */
  getPointOnPath(points: Point[], t: number): Point {
    // 1. ROBUSTNESS CHECK: Ensure we actually have valid points
    if (!points || !Array.isArray(points) || points.length === 0) {
      return { x: 0.5, y: 0.5 };
    }
    
    // Filter out any malformed points to prevent NaN errors
    const validPoints = points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
    
    if (validPoints.length === 0) return { x: 0.5, y: 0.5 };
    if (validPoints.length === 1) return { x: validPoints[0].x, y: validPoints[0].y };

    // 2. Determine which segment of the path we are currently in
    const n = validPoints.length - 1;
    const rawIndex = t * n;
    const i = Math.min(Math.floor(rawIndex), n - 1);
    const localT = rawIndex - i;

    // 3. Define the four control points for the curve segment
    // We clamp the indices to the start/end of the array for safety
    const p0 = validPoints[Math.max(i - 1, 0)];
    const p1 = validPoints[i];
    const p2 = validPoints[i + 1];
    const p3 = validPoints[Math.min(i + 2, n)];

    // 4. Catmull-Rom Spline Formula
    // This creates a smooth "gliding" motion between points
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

    // Final safety: ensure we never return NaN which makes Canvas elements vanish
    return {
      x: isNaN(result.x) ? 0.5 : result.x,
      y: isNaN(result.y) ? 0.5 : result.y
    };
  },

  /**
   * Generates a "Guide Line" for the canvas to render 
   * a preview of the path the emoji will take.
   */
  generatePathPoints(hints: Point[], resolution: number = 20): Point[] {
    if (!hints || hints.length === 0) return [];
    const path: Point[] = [];
    for (let i = 0; i <= resolution; i++) {
      path.push(this.getPointOnPath(hints, i / resolution));
    }
    return path;
  }
};

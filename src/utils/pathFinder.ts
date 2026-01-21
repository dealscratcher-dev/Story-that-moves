/**
 * PathFinder Logic for Narrative White-Space Navigation
 * * Takes normalized coordinates (0-1) from MongoDB layout_hints 
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
    if (points.length === 0) return { x: 0.5, y: 0.5 };
    if (points.length === 1) return points[0];

    // 1. Determine which segment of the path we are currently in
    const n = points.length - 1;
    const rawIndex = t * n;
    const i = Math.min(Math.floor(rawIndex), n - 1);
    const localT = rawIndex - i;

    // 2. Define the four control points for the curve segment
    // We clamp the indices to the start/end of the array for safety
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n)];

    // 3. Catmull-Rom Math: A = 0.5 * (2*P1)
    // B = 0.5 * (P2 - P0)
    // C = 0.5 * (2*P0 - 5*P1 + 4*P2 - P3)
    // D = 0.5 * (-P0 + 3*P1 - 3*P2 + P3)
    
    const calculateCoord = (c0: number, c1: number, c2: number, c3: number, T: number) => {
      return 0.5 * (
        (2 * c1) +
        (-c0 + c2) * T +
        (2 * c0 - 5 * c1 + 4 * c2 - c3) * T * T +
        (-c0 + 3 * c1 - 3 * c2 + c3) * T * T * T
      );
    };

    return {
      x: calculateCoord(p0.x, p1.x, p2.x, p3.x, localT),
      y: calculateCoord(p0.y, p1.y, p2.y, p3.y, localT)
    };
  },

  /**
   * Generates a "Guide Line" for the canvas to render 
   * a preview of the path the emoji will take.
   */
  generatePathPoints(hints: Point[], resolution: number = 20): Point[] {
    const path: Point[] = [];
    for (let i = 0; i <= resolution; i++) {
      path.push(this.getPointOnPath(hints, i / resolution));
    }
    return path;
  }
};

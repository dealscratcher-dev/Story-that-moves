export interface Point {
  x: number;
  y: number;
}

export interface PathState extends Point {
  angle: number; // The heading/direction in radians
}

export const pathFinder = {
  // Store reference to the stage grid for collision-free paths
  stageGrid: [] as Point[],

  /**
   * Update the internal stage grid reference
   */
  setStageGrid(grid: Point[]) {
    this.stageGrid = grid;
  },

  /**
   * Find the nearest white-space point from the stage grid
   */
  snapToStage(x: number, y: number, canvasWidth: number, canvasHeight: number): Point {
    if (this.stageGrid.length === 0) {
      return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    }

    // Convert normalized coordinates (0-1) to canvas pixel coordinates
    const targetX = x * canvasWidth;
    const targetY = y * canvasHeight;

    let closestPoint = this.stageGrid[0];
    let minDistanceSq = Infinity;

    // Use squared distance for performance (avoids Math.sqrt in loop)
    for (let i = 0; i < this.stageGrid.length; i++) {
      const point = this.stageGrid[i];
      const dx = point.x - targetX;
      const dy = point.y - targetY;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestPoint = point;
      }
    }

    return {
      x: closestPoint.x / canvasWidth,
      y: closestPoint.y / canvasHeight
    };
  },

  /**
   * Core Catmull-Rom Spline Math (Pure - No Snapping here)
   */
  getSplinePoint(points: Point[], t: number): Point {
    const n = points.length - 1;
    const rawIndex = t * n;
    const i = Math.min(Math.floor(rawIndex), n - 1);
    const localT = rawIndex - i;

    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n)];

    const calc = (c0: number, c1: number, c2: number, c3: number, T: number) => {
      return 0.5 * (
        (2 * c1) +
        (-c0 + c2) * T +
        (2 * c0 - 5 * c1 + 4 * c2 - c3) * T * T +
        (-c0 + 3 * c1 - 3 * c2 + c3) * T * T * T
      );
    };

    return {
      x: calc(p0.x, p1.x, p2.x, p3.x, localT),
      y: calc(p0.y, p1.y, p2.y, p3.y, localT)
    };
  },

  /**
   * Generate path points that are pre-snapped to the white space grid.
   * This is the "Blueprint" that the dots and entities both follow.
   */
  generatePathPoints(hints: Point[], resolution: number = 100, canvasWidth?: number, canvasHeight?: number): Point[] {
    if (!hints || hints.length === 0) return [];
    
    const path: Point[] = [];
    const steps = resolution * 2; // Higher detail for better grid matching

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const splinePos = this.getSplinePoint(hints, t);
      
      if (canvasWidth && canvasHeight && this.stageGrid.length > 0) {
        // Snap the raw spline coordinate to the nearest "Red Dot" location
        const snapped = this.snapToStage(splinePos.x, splinePos.y, canvasWidth, canvasHeight);
        path.push(snapped);
      } else {
        path.push(splinePos);
      }
    }

    // Clean the path: Remove points that snapped to the same grid coordinate
    return path.filter((p, i) => {
      if (i === 0) return true;
      const prev = path[i - 1];
      return Math.abs(p.x - prev.x) > 0.0001 || Math.abs(p.y - prev.y) > 0.0001;
    });
  },

  /**
   * Proximity Check for interactions
   */
  checkCollision(p1: Point, p2: Point, threshold: number = 0.05): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }
};

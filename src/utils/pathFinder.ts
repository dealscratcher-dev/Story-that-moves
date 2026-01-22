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
   * Call this from OverlayMotion whenever the grid is recalculated
   */
  setStageGrid(grid: Point[]) {
    this.stageGrid = grid;
  },

  /**
   * Find the nearest white-space point from the stage grid
   */
  snapToStage(x: number, y: number, canvasWidth: number, canvasHeight: number): Point {
    if (this.stageGrid.length === 0) {
      return { x: x / canvasWidth, y: y / canvasHeight };
    }

    // Convert normalized coordinates to canvas coordinates
    const targetX = x * canvasWidth;
    const targetY = y * canvasHeight;

    // Find closest stage point
    let closestPoint = this.stageGrid[0];
    let minDistance = Infinity;

    for (const point of this.stageGrid) {
      const dx = point.x - targetX;
      const dy = point.y - targetY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    // Return as normalized coordinates
    return {
      x: closestPoint.x / canvasWidth,
      y: closestPoint.y / canvasHeight
    };
  },

  /**
   * Calculates a point AND the heading (angle) on a Catmull-Rom spline.
   * NOW SNAPS TO STAGE GRID to avoid text areas.
   */
  getPointOnPath(points: Point[], t: number, canvasWidth?: number, canvasHeight?: number): PathState {
    if (!points || !Array.isArray(points) || points.length === 0) {
      return { x: 0.5, y: 0.5, angle: 0 };
    }
    
    const validPoints = points.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
    
    if (validPoints.length === 0) return { x: 0.5, y: 0.5, angle: 0 };
    if (validPoints.length === 1) {
      const snapped = canvasWidth && canvasHeight 
        ? this.snapToStage(validPoints[0].x, validPoints[0].y, canvasWidth, canvasHeight)
        : validPoints[0];
      return { x: snapped.x, y: snapped.y, angle: 0 };
    }

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

    // Calculate raw position
    let x = calculateCoord(p0.x, p1.x, p2.x, p3.x, localT);
    let y = calculateCoord(p0.y, p1.y, p2.y, p3.y, localT);

    // Snap to stage grid if canvas dimensions are provided
    if (canvasWidth && canvasHeight && this.stageGrid.length > 0) {
      const snapped = this.snapToStage(x, y, canvasWidth, canvasHeight);
      x = snapped.x;
      y = snapped.y;
    }

    // Calculate direction
    const lookAheadT = localT + 0.01;
    const aheadX = calculateCoord(p0.x, p1.x, p2.x, p3.x, lookAheadT);
    const aheadY = calculateCoord(p0.y, p1.y, p2.y, p3.y, lookAheadT);
    
    let angle = Math.atan2(aheadY - y, aheadX - x);

    return {
      x: Math.max(0, Math.min(1, isNaN(x) ? 0.5 : x)),
      y: Math.max(0, Math.min(1, isNaN(y) ? 0.5 : y)),
      angle: isNaN(angle) ? 0 : angle
    };
  },

  /**
   * Proximity Check: Tells the engine if two entities have "met" 
   */
  checkCollision(p1: Point, p2: Point, threshold: number = 0.05): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  },

  /**
   * Generate path points that follow the stage grid (avoiding text)
   */
  generatePathPoints(hints: Point[], resolution: number = 100, canvasWidth?: number, canvasHeight?: number): Point[] {
    if (!hints || hints.length === 0) return [];
    const path: Point[] = [];
    
    for (let i = 0; i <= resolution; i++) {
      const state = this.getPointOnPath(hints, i / resolution, canvasWidth, canvasHeight);
      path.push({ x: state.x, y: state.y });
    }
    
    return path;
  }
};

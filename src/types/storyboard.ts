export type MotionType = 'drift' | 'breathe' | 'pulse' | 'jitter';

export interface Point {
  x: number;
  y: number;
}

export interface StoryboardScene {
  type: 'character' | 'location' | 'object' | 'emotion' | 'action';
  name?: string;
  content: string;
  position: 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  animation: 'fadeSlideIn' | 'scaleIn' | 'bounceIn' | 'slideUp' | 'ripple';
  
  // --- Path-Finder & Emotion Extensions ---
  emotion: string;           // e.g., 'joyful', 'tense', 'calm'
  intensity: number;         // 0.0 to 1.0
  layout_hints: Point[];     // The whitespace coordinates from MongoDB
  duration?: number;         // Duration of the animation sequence
  sequence?: number;         // The order of appearance
  frameIndex?: number;       // Links to the CanvasRenderer background frame
  
  color?: string;
  textSegment?: string;
  description?: string;
}

export interface ScrollWaypoint {
  id: string;
  percentage: number;        // Changed from scrollPercent to match ImmersiveReader logic
  scene: StoryboardScene;
}

export interface Storyboard {
  article_id: string;
  url: string;
  title?: string;
  waypoints: ScrollWaypoint[];
  frames?: any[];            // Used by CanvasRenderer for background shapes
  createdAt?: string;
}

export interface ProcessingJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  article_id?: string;
}

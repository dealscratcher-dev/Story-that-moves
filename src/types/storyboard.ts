export type MotionType = 'drift' | 'breathe' | 'pulse' | 'jitter';

export interface Point {
  x: number;
  y: number;
  label?: string; // Matches your Mongo "label": "whitespace"
}

export interface StoryboardScene {
  storyboard_id: string;
  sequence: number;
  description: string;
  
  // Matches Mongo: emotion_curve { primary, intensity, valence }
  emotion_curve: {
    primary: string;   // This replaces the old 'emotion' string
    intensity: number; // This replaces the old 'intensity' number
    valence: number;
  };

  // Matches Mongo: layout_hints array
  layout_hints: Point[];
  
  // Matches Mongo: style_dna object
  style_dna: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    motionEase: string;
    particle_count: number;
  };

  duration: number;
  motion_ease: string;
  
  // Optional UI fields (keep these for the frontend logic)
  type?: 'character' | 'location' | 'object' | 'emotion' | 'action';
  frameIndex?: number;
  textSegment?: string;
}

// This represents a single Waypoint in the scroll logic
export interface ScrollWaypoint {
  id: string;
  percentage: number; 
  scene: StoryboardScene;
}

// Matches your Root Mongo Document
export interface Storyboard {
  _id?: { $oid: string };
  article_id: string;
  job_id: string;
  status: string;
  original_text: string;
  
  // NOTE: Your Mongo uses "storyboards" (plural), 
  // but your Waypoint logic likely needs to map these into waypoints.
  storyboards: StoryboardScene[]; 
  
  // Existing frontend fields
  waypoints: ScrollWaypoint[];
  frames?: any[]; 
  createdAt?: string;
}

export interface ProcessingJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  article_id?: string;
}

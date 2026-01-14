export interface StoryboardScene {
  type: 'character' | 'location' | 'object' | 'emotion' | 'action';
  name?: string;
  content: string;
  position: 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  animation: 'fadeSlideIn' | 'scaleIn' | 'bounceIn' | 'slideUp' | 'ripple';
  color?: string;
  textSegment?: string;
}

export interface ScrollWaypoint {
  id: string;
  scrollPercent: number;
  duration: number;
  scene: StoryboardScene;
}

export interface Storyboard {
  article_id: string;
  url: string;
  title?: string;
  waypoints: ScrollWaypoint[];
  createdAt?: string;
}

export interface ProcessingJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  article_id?: string;
}

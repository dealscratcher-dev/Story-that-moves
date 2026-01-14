import { Storyboard, ProcessingJob } from '../types/storyboard';

// Pull the Railway URL from your .env.VITE_API_BASE_URL
const FASTAPI_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class FastAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = FASTAPI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Ensure no double slashes
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint}`;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000); // Increased to 20s for slow LLM cold starts

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      clearTimeout(id);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server Error: ${response.status}`);
      }

      return response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Request timed out connecting to Railway');
      throw err;
    }
  }

  /**
   * 1. Kick off the Chaos Engine
   */
  async processArticle(text: string, url: string = ''): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/process', {
      method: 'POST',
      body: JSON.stringify({ 
        text, 
        url,
        style: "cinematic" 
      }),
    });
  }

  /**
   * 2. Check the status of a specific job
   */
  async getJobStatus(jobId: string): Promise<ProcessingJob> {
    return this.request<ProcessingJob>(`/jobs/${jobId}`);
  }

  /**
   * 3. Fetch the final visual storyboard data
   */
  async getStoryboard(articleId: string): Promise<Storyboard> {
    return this.request<Storyboard>(`/storyboard/${articleId}`);
  }

  /**
   * 4. Orchestrator: Polls until the backend saves to Mongo, then fetches the result
   */
  async pollAndFetch(
    jobId: string,
    onProgress?: (progress: number) => void
  ): Promise<Storyboard> {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max (LLMs can be slow)

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJobStatus(jobId);
          
          if (onProgress) onProgress(job.progress || 0);

          // MATCHING: Our backend returns "complete"
          if (job.status === 'complete' && job.article_id) {
            const finalStoryboard = await this.getStoryboard(job.article_id);
            return resolve(finalStoryboard);
          }

          if (job.status === 'failed') {
            return reject(new Error(job.error || 'The Chaos Engine failed to expand this story.'));
          }

          if (++attempts >= maxAttempts) {
            return reject(new Error('The director took too long to think. Please try again.'));
          }
          
          // Poll every 2 seconds
          setTimeout(poll, 2000);
        } catch (error) {
          reject(error);
        }
      };
      poll();
    });
  }
}

export const fastapiClient = new FastAPIClient();
export default fastapiClient;

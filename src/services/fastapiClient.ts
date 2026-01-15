import { Storyboard, ProcessingJob } from '../types/storyboard';

/**
 * PRODUCTION URL: Explicitly defined to ensure connectivity 
 * if environment variables are not correctly picked up by Netlify.
 */
const RAILWAY_PROD_URL = 'https://backend-story-that-moves-sandbox.up.railway.app';
const FASTAPI_BASE_URL = import.meta.env.VITE_API_BASE_URL || RAILWAY_PROD_URL;

class FastAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = FASTAPI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Universal request handler with timeout and CORS safety
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint}`;
    
    const controller = new AbortController();
    // Increased to 30s to account for LLM cold starts and Railway spin-up
    const id = setTimeout(() => controller.abort(), 30000); 

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
   * Revised argument order to ensure text and url are passed correctly
   */
  async processArticle(url: string, text: string): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/process', {
      method: 'POST',
      body: JSON.stringify({ 
        url,
        text, 
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
   * 4. COMPATIBILITY ALIAS: pollJobCompletion
   * Matches the call signature used in DocumentInput.tsx to stop 
   * "FastAPI offline" errors caused by undefined function names.
   */
  async pollJobCompletion(jobId: string): Promise<Storyboard> {
    return this.pollAndFetch(jobId);
  }

  /**
   * 5. Orchestrator: Polls status until complete, then fetches storyboard
   */
  async pollAndFetch(
    jobId: string,
    onProgress?: (progress: number) => void
  ): Promise<Storyboard> {
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes max for deep narrative analysis

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJobStatus(jobId);
          
          if (onProgress) onProgress(job.progress || 0);

          // If the backend has finished processing
          if (job.status === 'complete' && job.article_id) {
            const finalStoryboard = await this.getStoryboard(job.article_id);
            return resolve(finalStoryboard);
          }

          // Handle explicit failure
          if (job.status === 'failed') {
            return reject(new Error(job.error || 'The Chaos Engine failed.'));
          }

          // Handle timeout
          if (++attempts >= maxAttempts) {
            return reject(new Error('The director took too long to think.'));
          }
          
          // Poll every 3 seconds to avoid Railway rate limiting
          setTimeout(poll, 3000);
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

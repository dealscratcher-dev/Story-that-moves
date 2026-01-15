import { Storyboard, ProcessingJob } from '../types/storyboard';

// Hardcoded for testing to ensure Netlify env vars aren't the issue
const RAILWAY_PROD_URL = 'https://backend-story-that-moves-sandbox.up.railway.app';
const FASTAPI_BASE_URL = import.meta.env.VITE_API_BASE_URL || RAILWAY_PROD_URL;

class FastAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = FASTAPI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000); // 30s for heavy Groq loads

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
      if (err.name === 'AbortError') throw new Error('Railway Timeout: Backend is cold-starting.');
      throw err;
    }
  }

  async processArticle(url: string, text: string): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/process', {
      method: 'POST',
      body: JSON.stringify({ url, text, style: "cinematic" }),
    });
  }

  async getJobStatus(jobId: string): Promise<ProcessingJob> {
    return this.request<ProcessingJob>(`/jobs/${jobId}`);
  }

  async getStoryboard(articleId: string): Promise<Storyboard> {
    return this.request<Storyboard>(`/storyboard/${articleId}`);
  }

  /**
   * ALIAS FOR COMPATIBILITY
   * This ensures DocumentInput.tsx can call it regardless of naming
   */
  async pollJobCompletion(jobId: string) {
    return this.pollAndFetch(jobId);
  }

  async pollAndFetch(
    jobId: string,
    onProgress?: (progress: number) => void
  ): Promise<Storyboard> {
    let attempts = 0;
    const maxAttempts = 40; 

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJobStatus(jobId);
          if (onProgress) onProgress(job.progress || 0);

          if (job.status === 'complete' && job.article_id) {
            const finalStoryboard = await this.getStoryboard(job.article_id);
            return resolve(finalStoryboard);
          }

          if (job.status === 'failed') {
            return reject(new Error(job.error || 'Chaos Engine Failure.'));
          }

          if (++attempts >= maxAttempts) {
            return reject(new Error('Backend processing timed out.'));
          }
          
          setTimeout(poll, 3000); // 3s interval is safer for Railway rate limits
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

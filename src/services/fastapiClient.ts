import { Storyboard, ProcessingJob } from '../types/storyboard';

const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

class FastAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = FASTAPI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Add a simple timeout to the fetch request
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
  }

  // Tells FastAPI to check Mongo first, then Groq
  async processArticle(url: string, text: string): Promise<ProcessingJob> {
    return this.request<ProcessingJob>('/api/process-article', {
      method: 'POST',
      body: JSON.stringify({ 
        url, 
        text,
        db_context: "Story-that-moves" // Signal to backend which DB to use
      }),
    });
  }

  async getJobStatus(jobId: string): Promise<ProcessingJob> {
    return this.request<ProcessingJob>(`/api/job/${jobId}`);
  }

  async getStoryboard(articleId: string): Promise<Storyboard> {
    return this.request<Storyboard>(`/api/storyboard/${articleId}`);
  }

  // Polling logic to wait for the Groq LLM to finish thinking
  async pollJobCompletion(
    jobId: string,
    onProgress?: (job: ProcessingJob) => void
  ): Promise<ProcessingJob> {
    let attempts = 0;
    const maxAttempts = 40;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJobStatus(jobId);
          if (onProgress) onProgress(job);

          if (job.status === 'completed') return resolve(job);
          if (job.status === 'failed') return reject(new Error(job.error));

          if (++attempts >= maxAttempts) return reject(new Error('Analysis timed out'));
          
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

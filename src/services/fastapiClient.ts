import { Storyboard, ProcessingJob } from '../types/storyboard';

const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

class FastAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = FASTAPI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async processArticle(url: string, text: string): Promise<ProcessingJob> {
    return this.request<ProcessingJob>('/api/process-article', {
      method: 'POST',
      body: JSON.stringify({ url, text }),
    });
  }

  async getJobStatus(jobId: string): Promise<ProcessingJob> {
    return this.request<ProcessingJob>(`/api/job/${jobId}`);
  }

  async getStoryboard(articleId: string): Promise<Storyboard> {
    return this.request<Storyboard>(`/api/storyboard/${articleId}`);
  }

  async pollJobCompletion(
    jobId: string,
    onProgress?: (job: ProcessingJob) => void,
    pollInterval: number = 2000,
    maxAttempts: number = 60
  ): Promise<ProcessingJob> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const job = await this.getJobStatus(jobId);

          if (onProgress) {
            onProgress(job);
          }

          if (job.status === 'completed') {
            resolve(job);
            return;
          }

          if (job.status === 'failed') {
            reject(new Error(job.error || 'Job failed'));
            return;
          }

          if (attempts >= maxAttempts) {
            reject(new Error('Polling timeout exceeded'));
            return;
          }

          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  async extractText(html: string): Promise<{ text: string }> {
    return this.request<{ text: string }>('/api/extract-text', {
      method: 'POST',
      body: JSON.stringify({ html }),
    });
  }

  async healthCheck(): Promise<{ status: string; version?: string }> {
    return this.request<{ status: string; version?: string }>('/api/health');
  }
}

export const fastapiClient = new FastAPIClient();
export default FastAPIClient;

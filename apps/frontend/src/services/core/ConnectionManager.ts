import { toast } from '@/components/ui/use-toast';

export interface ConnectionConfig {
  baseUrl: string;
  maxRetries: number;
  retryDelay: number;
  healthEndpoint: string;
}

export interface ConnectionState {
  isConnected: boolean;
  lastError: Error | null;
  retryCount: number;
  lastChecked: Date;
}

export class ConnectionManager {
  private static instance: ConnectionManager;
  private config: ConnectionConfig;
  private state: ConnectionState;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      maxRetries: 3,
      retryDelay: 2000,
      healthEndpoint: '/api/health',
      ...config
    };

    this.state = {
      isConnected: false,
      lastError: null,
      retryCount: 0,
      lastChecked: new Date()
    };
  }

  static getInstance(config?: Partial<ConnectionConfig>): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager(config);
    }
    return ConnectionManager.instance;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.healthEndpoint}`);
      this.state.isConnected = response.ok;
      this.state.lastChecked = new Date();
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      // Reset retry count on successful connection
      this.state.retryCount = 0;
      return true;
    } catch (error) {
      this.state.isConnected = false;
      this.state.lastError = error as Error;
      this.state.lastChecked = new Date();
      
      console.error('Connection check failed:', error);
      return false;
    }
  }

  async ensureConnection(): Promise<boolean> {
    if (this.state.isConnected) {
      return true;
    }

    while (this.state.retryCount < this.config.maxRetries) {
      if (await this.checkConnection()) {
        return true;
      }

      this.state.retryCount++;
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
    }

    toast({
      title: "Connection Error",
      description: "Unable to connect to server. Please check your connection and try again.",
      variant: "destructive"
    });

    return false;
  }

  startHealthCheck(interval: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, interval);
  }

  stopHealthCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  reset(): void {
    this.state = {
      isConnected: false,
      lastError: null,
      retryCount: 0,
      lastChecked: new Date()
    };
  }
} 
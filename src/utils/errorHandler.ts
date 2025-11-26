// src/utils/errorHandler.ts

export interface ErrorInfo {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  type: 'api' | 'network' | 'translation' | 'ui' | 'storage' | 'unknown';
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class ErrorTracker {
  private errors: ErrorInfo[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private maxEntries = 100;

  trackError(error: Error, context?: Record<string, unknown>, type: ErrorInfo['type'] = 'unknown'): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      type,
    };

    this.errors.push(errorInfo);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxEntries) {
      this.errors = this.errors.slice(-this.maxEntries);
    }

    console.error('Tracked error:', errorInfo);
  }

  trackPerformance(name: string, duration: number, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.performanceMetrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.performanceMetrics.length > this.maxEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxEntries);
    }

    console.log('Performance metric:', metric);
  }

  getErrorStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    this.errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byType,
    };
  }

  getPerformanceStats(): Record<string, { count: number; average: number; max: number }> {
    const stats: Record<string, { count: number; total: number; max: number }> = {};
    
    this.performanceMetrics.forEach(metric => {
      if (!stats[metric.name]) {
        stats[metric.name] = { count: 0, total: 0, max: 0 };
      }
      
      stats[metric.name].count++;
      stats[metric.name].total += metric.duration;
      stats[metric.name].max = Math.max(stats[metric.name].max, metric.duration);
    });

    const result: Record<string, { count: number; average: number; max: number }> = {};
    
    Object.entries(stats).forEach(([name, data]) => {
      result[name] = {
        count: data.count,
        average: data.total / data.count,
        max: data.max,
      };
    });

    return result;
  }

  clear(): void {
    this.errors = [];
    this.performanceMetrics = [];
  }

  exportData(): { errors: ErrorInfo[]; performance: PerformanceMetric[] } {
    return {
      errors: [...this.errors],
      performance: [...this.performanceMetrics],
    };
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

// Error boundary for React components
export class TranslationErrorBoundary {
  static hasError = false;

  static getDerivedStateFromError(error: Error) {
    errorTracker.trackError(error, {}, 'ui');
    TranslationErrorBoundary.hasError = true;
    return { hasError: true };
  }

  static clearError(): void {
    TranslationErrorBoundary.hasError = false;
  }
}

// Performance monitoring utilities
export const withPerformanceTracking = <T extends (...args: any[]) => any>(
  fn: T,
  name: string,
): ((...args: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const end = performance.now();
          errorTracker.trackPerformance(name, end - start);
        }) as ReturnType<T>;
      }
      
      const end = performance.now();
      errorTracker.trackPerformance(name, end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      errorTracker.trackPerformance(name, end - start, { error: true });
      throw error;
    }
  };
};

// API error handling
export const handleApiError = (error: unknown, context?: Record<string, unknown>): string => {
  let errorMessage = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    errorTracker.trackError(error, context, 'api');
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
    errorTracker.trackError(new Error(error), context, 'api');
  } else {
    errorTracker.trackError(new Error('Unknown API error'), context, 'api');
  }

  return errorMessage;
};

// Network error handling
export const handleNetworkError = (error: unknown, url: string): string => {
  let errorMessage = 'Network error occurred';
  
  if (error instanceof Error) {
    errorTracker.trackError(error, { url }, 'network');
    errorMessage = error.message;
  }

  return errorMessage;
};

// Storage error handling
export const handleStorageError = (error: unknown, operation: string): void => {
  if (error instanceof Error) {
    errorTracker.trackError(error, { operation }, 'storage');
  }
};
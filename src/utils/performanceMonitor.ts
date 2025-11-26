// src/utils/performanceMonitor.ts
import React from 'react';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: 'api' | 'render' | 'user-interaction' | 'storage' | 'network';
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  average: number;
  min: number;
  max: number;
  count: number;
  lastValue: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxEntries = 1000;
  private enabled = true;

  constructor() {
    this.setupPerformanceObserver();
  }

  private setupPerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Monitor paint metrics
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: entry.name,
              duration: entry.startTime,
              timestamp: Date.now(),
              category: 'render',
              metadata: {
                entryType: entry.entryType,
                startTime: entry.startTime,
              },
            });
          }
        });

        paintObserver.observe({ entryTypes: ['paint'] });

        // Monitor long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'long-task',
              duration: entry.duration,
              timestamp: Date.now(),
              category: 'render',
              metadata: {
                startTime: entry.startTime,
                attribution: (entry as any).attribution,
              },
            });
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  recordMetric(metric: PerformanceMetric): void {
    if (!this.enabled) return;

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(-this.maxEntries);
    }

    // Log performance issues
    if (metric.duration > 1000) {
      console.warn(`Slow ${metric.category} operation: ${metric.name} took ${metric.duration}ms`);
    }
  }

  measure<T>(name: string, category: PerformanceMetric['category'], fn: () => T): T;
  measure<T>(name: string, category: PerformanceMetric['category'], fn: () => Promise<T>): Promise<T>;
  measure<T>(name: string, category: PerformanceMetric['category'], fn: () => T | Promise<T>): T | Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          this.recordMetric({
            name,
            duration,
            timestamp: Date.now(),
            category,
          });
        }) as T | Promise<T>;
      }
      
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        category,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        category,
        metadata: { error: true },
      });
      throw error;
    }
  }

  async measureAsync<T>(
    name: string,
    category: PerformanceMetric['category'],
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        category,
        metadata,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        category,
        metadata: { ...metadata, error: true },
      });
      throw error;
    }
  }

  getStats(name: string, category?: PerformanceMetric['category']): PerformanceStats | null {
    const relevantMetrics = this.metrics.filter(
      m => m.name === name && (!category || m.category === category),
    );

    if (relevantMetrics.length === 0) {
      return null;
    }

    const durations = relevantMetrics.map(m => m.duration);
    const lastValue = durations[durations.length - 1];

    return {
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: durations.length,
      lastValue,
    };
  }

  getCategoryStats(category: PerformanceMetric['category']): Record<string, PerformanceStats> {
    const categoryMetrics = this.metrics.filter(m => m.category === category);
    const stats: Record<string, PerformanceStats> = {};

    const names = new Set(categoryMetrics.map(m => m.name));
    
    names.forEach(name => {
      const metricStats = this.getStats(name, category);
      if (metricStats) {
        stats[name] = metricStats;
      }
    });

    return stats;
  }

  getSlowOperations(threshold = 500): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  getPerformanceReport(): string {
    const categories = ['api', 'render', 'user-interaction', 'storage', 'network'] as const;
    const report: string[] = [];

    report.push('=== Performance Report ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Total metrics: ${this.metrics.length}`);
    report.push('');

    categories.forEach(category => {
      const categoryStats = this.getCategoryStats(category);
      const categoryMetrics = Object.keys(categoryStats);
      
      if (categoryMetrics.length > 0) {
        report.push(`${category.toUpperCase()} Operations:`);
        
        categoryMetrics.forEach(name => {
          const stats = categoryStats[name];
          report.push(`  ${name}:`);
          report.push(`    Count: ${stats.count}`);
          report.push(`    Average: ${stats.average.toFixed(2)}ms`);
          report.push(`    Min: ${stats.min.toFixed(2)}ms`);
          report.push(`    Max: ${stats.max.toFixed(2)}ms`);
          report.push(`    Last: ${stats.lastValue.toFixed(2)}ms`);
        });
        
        report.push('');
      }
    });

    const slowOps = this.getSlowOperations();
    if (slowOps.length > 0) {
      report.push('Slow Operations (>500ms):');
      slowOps.forEach(op => {
        report.push(`  ${op.name} (${op.category}): ${op.duration.toFixed(2)}ms`);
      });
      report.push('');
    }

    return report.join('\n');
  }

  clear(): void {
    this.metrics = [];
  }

  exportData(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Utility functions for common performance measurements
export const measureApiCall = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> => {
  return performanceMonitor.measureAsync(name, 'api', fn, metadata);
};

export const measureRender = <T>(name: string, fn: () => T): T => {
  return performanceMonitor.measure(name, 'render', fn);
};

export const measureUserInteraction = <T>(name: string, fn: () => T): T => {
  return performanceMonitor.measure(name, 'user-interaction', fn);
};

export const measureStorage = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> => {
  return performanceMonitor.measureAsync(name, 'storage', fn, metadata);
};

export const measureNetwork = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> => {
  return performanceMonitor.measureAsync(name, 'network', fn, metadata);
};

// Performance monitoring for React components
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  name: string,
): React.ComponentType<P> => {
  return (props: P) => {
    return performanceMonitor.measure(name, 'render', () => {
      return React.createElement(Component, props);
    });
  };
};

// Memory usage monitoring
export const getMemoryUsage = (): {
  used: number;
  total: number;
  percentage: number;
} | null => {
  if ('memory' in performance) {
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      const used = memoryInfo.usedJSHeapSize;
      const total = memoryInfo.totalJSHeapSize;
      const limit = memoryInfo.jsHeapSizeLimit;
      
      return {
        used: used / 1024 / 1024, // MB
        total: total / 1024 / 1024, // MB
        percentage: (used / total) * 100,
      };
    }
  }
  
  return null;
};
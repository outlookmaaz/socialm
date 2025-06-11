import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  connectionType: string;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    const measurePerformance = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const memory = (performance as any).memory;
        const connection = (navigator as any).connection;

        setMetrics({
          loadTime: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          renderTime: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
          memoryUsage: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
          connectionType: connection ? connection.effectiveType : 'unknown'
        });
      }
    };

    // Measure performance after page load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    // Show metrics in development mode
    if (import.meta.env.DEV) {
      setShowMetrics(true);
    }

    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, []);

  if (!showMetrics || !metrics) return null;

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-64 opacity-80 hover:opacity-100 transition-opacity">
      <CardContent className="p-3">
        <h4 className="font-pixelated text-xs font-medium mb-2">Performance</h4>
        <div className="space-y-1 text-xs font-pixelated">
          <div className="flex justify-between">
            <span>Load:</span>
            <span className={metrics.loadTime > 3000 ? 'text-red-500' : 'text-green-500'}>
              {metrics.loadTime}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span>Render:</span>
            <span className={metrics.renderTime > 1000 ? 'text-red-500' : 'text-green-500'}>
              {metrics.renderTime}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={metrics.memoryUsage > 50 ? 'text-red-500' : 'text-green-500'}>
              {metrics.memoryUsage}MB
            </span>
          </div>
          <div className="flex justify-between">
            <span>Network:</span>
            <span>{metrics.connectionType}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
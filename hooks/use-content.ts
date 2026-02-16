'use client';

import { useEffect, useState } from 'react';
import { ContentItem } from '@/types';

interface UseContentReturn {
  items: ContentItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useContent(): UseContentReturn {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchContent() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/content', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch content');
        }

        const payload = await response.json();
        const nextItems = Array.isArray(payload.items) ? payload.items : [];
        setItems(nextItems as ContentItem[]);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchContent();

    return () => {
      controller.abort();
    };
  }, []);

  return { items, isLoading, error };
}

'use client';

import { useEffect, useState } from 'react';
import { ContentItem } from '@/types';
import { isDevBypass } from '@/lib/dev-mode';
import { getMockContent } from '@/lib/mock-store';

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
    async function fetchContent() {
      try {
        setIsLoading(true);

        if (isDevBypass) {
          setItems(getMockContent());
          return;
        }

        setItems([]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, []);

  return { items, isLoading, error };
}

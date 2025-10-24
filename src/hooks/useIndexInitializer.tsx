import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that automatically initializes the dive manual index on app startup.
 * Runs once per session and handles errors gracefully without blocking the UI.
 */
export const useIndexInitializer = () => {
  const hasInitialized = useRef(false);

  useEffect(() => {
    const initializeIndex = async () => {
      // Only run once per session
      if (hasInitialized.current) return;
      
      // Check localStorage to avoid re-checking too frequently (24h cache)
      const lastCheck = localStorage.getItem('dive_index_last_check');
      const now = Date.now();
      if (lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) {
        console.log('[Index Initializer] Skipping - checked within last 24h');
        return;
      }

      hasInitialized.current = true;
      console.log('[Index Initializer] Starting background index check...');

      try {
        const { data, error } = await supabase.functions.invoke('init-dive-index');

        if (error) {
          console.error('[Index Initializer] Error:', error);
          return;
        }

        if (data?.seeded) {
          console.log(`[Index Initializer] Index populated: ${data.chunks} chunks created`);
        } else {
          console.log('[Index Initializer] Index already exists - no action needed');
        }

        // Cache successful check
        localStorage.setItem('dive_index_last_check', now.toString());
      } catch (error) {
        console.error('[Index Initializer] Failed to initialize:', error);
        // Don't block app - just log the error
      }
    };

    initializeIndex();
  }, []);
};

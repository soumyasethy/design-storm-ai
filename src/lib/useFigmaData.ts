/**
 * useFigmaData - React Hook for IndexedDB Storage
 * 
 * Provides easy-to-use functions for saving and loading Figma data
 * with IndexedDB instead of localStorage.
 * 
 * Usage:
 *   const { saveFigmaData, loadFigmaData, clearData, isLoading, error } = useFigmaData();
 *   
 *   await saveFigmaData(largeDesignObject);
 *   const data = await loadFigmaData();
 */

import { useState, useCallback, useEffect } from 'react';
import {
  FigmaStorage,
  saveFigmaData as saveData,
  loadFigmaData as loadData,
  removeFigmaData,
  saveFigmaToken as saveToken,
  loadFigmaToken as loadToken,
  removeFigmaToken,
  saveFigmaUrl as saveUrl,
  loadFigmaUrl as loadUrl,
  removeFigmaUrl,
  clearAllFigmaData,
  migrateFromLocalStorage
} from './figmaStorage';

export interface UseFigmaDataReturn {
  // Data operations
  saveFigmaData: (data: any) => Promise<boolean>;
  loadFigmaData: () => Promise<any | null>;
  removeFigmaData: () => Promise<boolean>;
  
  // Token operations
  saveFigmaToken: (token: string) => Promise<boolean>;
  loadFigmaToken: () => Promise<string | null>;
  removeFigmaToken: () => Promise<boolean>;
  
  // URL operations
  saveFigmaUrl: (url: string) => Promise<boolean>;
  loadFigmaUrl: () => Promise<string | null>;
  removeFigmaUrl: () => Promise<boolean>;
  
  // Utility operations
  clearAllData: () => Promise<boolean>;
  migrateFromLocalStorage: () => Promise<{migrated: string[], failed: string[]}>;
  getStorageInfo: () => Promise<any>;
  
  // State
  isLoading: boolean;
  error: string | null;
  lastOperation: string | null;
}

/**
 * React Hook for Figma data storage with IndexedDB
 */
export const useFigmaData = (): UseFigmaDataReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);

  // Helper to wrap operations with loading and error handling
  const wrapOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);
    setLastOperation(operationName);
    
    try {
      const result = await operation();
      setError(null);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`${operationName} failed: ${errorMessage}`);
      console.error(`❌ ${operationName} failed:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Figma Data operations
  const saveFigmaData = useCallback(async (data: any): Promise<boolean> => {
    return wrapOperation(async () => {
      const success = await saveData(data);
      if (!success) {
        throw new Error('Failed to save Figma data to IndexedDB');
      }
      return success;
    }, 'Save Figma Data');
  }, [wrapOperation]);

  const loadFigmaData = useCallback(async (): Promise<any | null> => {
    return wrapOperation(async () => {
      return await loadData();
    }, 'Load Figma Data');
  }, [wrapOperation]);

  const removeFigmaDataWrapper = useCallback(async (): Promise<boolean> => {
    return wrapOperation(async () => {
      const success = await removeFigmaData();
      if (!success) {
        throw new Error('Failed to remove Figma data from IndexedDB');
      }
      return success;
    }, 'Remove Figma Data');
  }, [wrapOperation]);

  // Token operations
  const saveFigmaToken = useCallback(async (token: string): Promise<boolean> => {
    return wrapOperation(async () => {
      const success = await saveToken(token);
      if (!success) {
        throw new Error('Failed to save Figma token to IndexedDB');
      }
      return success;
    }, 'Save Figma Token');
  }, [wrapOperation]);

  const loadFigmaToken = useCallback(async (): Promise<string | null> => {
    return wrapOperation(async () => {
      return await loadToken();
    }, 'Load Figma Token');
  }, [wrapOperation]);

  const removeFigmaTokenWrapper = useCallback(async (): Promise<boolean> => {
    return wrapOperation(async () => {
      const success = await removeFigmaToken();
      if (!success) {
        throw new Error('Failed to remove Figma token from IndexedDB');
      }
      return success;
    }, 'Remove Figma Token');
  }, [wrapOperation]);

  // URL operations
  const saveFigmaUrl = useCallback(async (url: string): Promise<boolean> => {
    return wrapOperation(async () => {
      const success = await saveUrl(url);
      if (!success) {
        throw new Error('Failed to save Figma URL to IndexedDB');
      }
      return success;
    }, 'Save Figma URL');
  }, [wrapOperation]);

  const loadFigmaUrl = useCallback(async (): Promise<string | null> => {
    return wrapOperation(async () => {
      return await loadUrl();
    }, 'Load Figma URL');
  }, [wrapOperation]);

  const removeFigmaUrlWrapper = useCallback(async (): Promise<boolean> => {
    return wrapOperation(async () => {
      const success = await removeFigmaUrl();
      if (!success) {
        throw new Error('Failed to remove Figma URL from IndexedDB');
      }
      return success;
    }, 'Remove Figma URL');
  }, [wrapOperation]);

  // Utility operations
  const clearAllData = useCallback(async (): Promise<boolean> => {
    return wrapOperation(async () => {
      const success = await clearAllFigmaData();
      if (!success) {
        throw new Error('Failed to clear all data from IndexedDB');
      }
      return success;
    }, 'Clear All Data');
  }, [wrapOperation]);

  const migrateFromLocalStorageWrapper = useCallback(async () => {
    return wrapOperation(async () => {
      return await migrateFromLocalStorage();
    }, 'Migrate from localStorage');
  }, [wrapOperation]);

  const getStorageInfo = useCallback(async () => {
    return wrapOperation(async () => {
      return await FigmaStorage.getStorageInfo();
    }, 'Get Storage Info');
  }, [wrapOperation]);

  // Auto-migrate on first use (optional)
  useEffect(() => {
    const autoMigrate = async () => {
      try {
        // Check if there's data in localStorage to migrate
        if (typeof window !== 'undefined' && localStorage.getItem('figmaData')) {
          console.log('🔄 Auto-migrating data from localStorage to IndexedDB...');
          await migrateFromLocalStorage();
        }
      } catch (error) {
        console.error('❌ Auto-migration failed:', error);
      }
    };

    autoMigrate();
  }, []);

  return {
    // Data operations
    saveFigmaData,
    loadFigmaData,
    removeFigmaData: removeFigmaDataWrapper,
    
    // Token operations
    saveFigmaToken,
    loadFigmaToken,
    removeFigmaToken: removeFigmaTokenWrapper,
    
    // URL operations
    saveFigmaUrl,
    loadFigmaUrl,
    removeFigmaUrl: removeFigmaUrlWrapper,
    
    // Utility operations
    clearAllData,
    migrateFromLocalStorage: migrateFromLocalStorageWrapper,
    getStorageInfo,
    
    // State
    isLoading,
    error,
    lastOperation
  };
};

export default useFigmaData;
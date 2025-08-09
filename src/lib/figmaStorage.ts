/**
 * Figma Data Storage - IndexedDB Implementation
 * 
 * Replaces localStorage with IndexedDB for storing large Figma JSON data.
 * Supports 10MB-50MB+ design files without QuotaExceededError.
 * 
 * Uses idb-keyval for simple key-value storage in IndexedDB.
 */

import { get, set, del, clear } from 'idb-keyval';

// Storage keys for different data types
export const STORAGE_KEYS = {
  FIGMA_DATA: 'figmaData',
  FIGMA_TOKEN: 'figmaToken', 
  FIGMA_URL: 'figmaUrl',
  FIGMA_AUTH: 'figmaAuth',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Enhanced storage interface with error handling and logging
 */
export class FigmaStorage {
  
  /**
   * Save data to IndexedDB with error handling
   */
  static async save<T>(key: StorageKey, data: T): Promise<boolean> {
    try {
      console.log(`💾 Saving to IndexedDB: ${key}`, {
        type: typeof data,
        size: JSON.stringify(data).length + ' characters'
      });
      
      await set(key, data);
      console.log(`✅ Successfully saved ${key} to IndexedDB`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save ${key} to IndexedDB:`, error);
      
      // Handle specific IndexedDB errors
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          console.error('💥 IndexedDB quota exceeded! Consider clearing old data.');
        } else if (error.name === 'InvalidStateError') {
          console.error('💥 IndexedDB is not available (private browsing mode?)');
        }
      }
      
      return false;
    }
  }

  /**
   * Load data from IndexedDB with error handling
   */
  static async load<T>(key: StorageKey): Promise<T | null> {
    try {
      console.log(`📂 Loading from IndexedDB: ${key}`);
      
      const data = await get(key) as T;
      
      if (data !== undefined) {
        console.log(`✅ Successfully loaded ${key} from IndexedDB`, {
          type: typeof data,
          size: JSON.stringify(data).length + ' characters'
        });
        return data;
      } else {
        console.log(`📭 No data found for ${key} in IndexedDB`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to load ${key} from IndexedDB:`, error);
      return null;
    }
  }

  /**
   * Remove specific data from IndexedDB
   */
  static async remove(key: StorageKey): Promise<boolean> {
    try {
      console.log(`🗑️ Removing from IndexedDB: ${key}`);
      await del(key);
      console.log(`✅ Successfully removed ${key} from IndexedDB`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove ${key} from IndexedDB:`, error);
      return false;
    }
  }

  /**
   * Clear all data from IndexedDB
   */
  static async clearAll(): Promise<boolean> {
    try {
      console.log('🧹 Clearing all data from IndexedDB');
      await clear();
      console.log('✅ Successfully cleared all IndexedDB data');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear IndexedDB data:', error);
      return false;
    }
  }

  /**
   * Check if IndexedDB is available
   */
  static isAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && 'indexedDB' in window;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage information (approximate)
   */
  static async getStorageInfo(): Promise<{
    available: boolean;
    keys: string[];
    estimatedSize: number;
  }> {
    const info = {
      available: this.isAvailable(),
      keys: [] as string[],
      estimatedSize: 0
    };

    if (!info.available) {
      return info;
    }

    try {
      // Check each known key
      for (const key of Object.values(STORAGE_KEYS)) {
        const data = await get(key);
        if (data !== undefined) {
          info.keys.push(key);
          info.estimatedSize += JSON.stringify(data).length;
        }
      }
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
    }

    return info;
  }
}

/**
 * Convenience functions for common operations
 */

// Figma Data operations
export const saveFigmaData = (data: any) => FigmaStorage.save(STORAGE_KEYS.FIGMA_DATA, data);
export const loadFigmaData = () => FigmaStorage.load(STORAGE_KEYS.FIGMA_DATA);
export const removeFigmaData = () => FigmaStorage.remove(STORAGE_KEYS.FIGMA_DATA);

// Figma Token operations  
export const saveFigmaToken = (token: string) => FigmaStorage.save(STORAGE_KEYS.FIGMA_TOKEN, token);
export const loadFigmaToken = () => FigmaStorage.load<string>(STORAGE_KEYS.FIGMA_TOKEN);
export const removeFigmaToken = () => FigmaStorage.remove(STORAGE_KEYS.FIGMA_TOKEN);

// Figma URL operations
export const saveFigmaUrl = (url: string) => FigmaStorage.save(STORAGE_KEYS.FIGMA_URL, url);
export const loadFigmaUrl = () => FigmaStorage.load<string>(STORAGE_KEYS.FIGMA_URL);
export const removeFigmaUrl = () => FigmaStorage.remove(STORAGE_KEYS.FIGMA_URL);

// Figma Auth operations
export const saveFigmaAuth = (auth: any) => FigmaStorage.save(STORAGE_KEYS.FIGMA_AUTH, auth);
export const loadFigmaAuth = () => FigmaStorage.load(STORAGE_KEYS.FIGMA_AUTH);
export const removeFigmaAuth = () => FigmaStorage.remove(STORAGE_KEYS.FIGMA_AUTH);

// Clear all operations
export const clearAllFigmaData = () => FigmaStorage.clearAll();

/**
 * Migration helper - move data from localStorage to IndexedDB
 */
export const migrateFromLocalStorage = async (): Promise<{
  migrated: string[];
  failed: string[];
}> => {
  const result = {
    migrated: [] as string[],
    failed: [] as string[]
  };

  if (typeof window === 'undefined') {
    return result;
  }

  console.log('🔄 Starting migration from localStorage to IndexedDB...');

  // Define localStorage to IndexedDB key mappings
  const migrations = [
    { localKey: 'figmaData', storageKey: STORAGE_KEYS.FIGMA_DATA },
    { localKey: 'figmaToken', storageKey: STORAGE_KEYS.FIGMA_TOKEN },
    { localKey: 'figmaUrl', storageKey: STORAGE_KEYS.FIGMA_URL },
  ];

  for (const { localKey, storageKey } of migrations) {
    try {
      const localData = localStorage.getItem(localKey);
      if (localData) {
        // Parse JSON data if it looks like JSON
        let parsedData = localData;
        try {
          if (localData.startsWith('{') || localData.startsWith('[')) {
            parsedData = JSON.parse(localData);
          }
        } catch {
          // Keep as string if not valid JSON
        }

        // Save to IndexedDB
        const success = await FigmaStorage.save(storageKey, parsedData);
        if (success) {
          // Remove from localStorage after successful migration
          localStorage.removeItem(localKey);
          result.migrated.push(localKey);
          console.log(`✅ Migrated ${localKey} from localStorage to IndexedDB`);
        } else {
          result.failed.push(localKey);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to migrate ${localKey}:`, error);
      result.failed.push(localKey);
    }
  }

  console.log('🎉 Migration complete:', result);
  return result;
};
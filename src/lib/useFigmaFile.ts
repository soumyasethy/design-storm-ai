import { useState, useCallback, useEffect } from 'react';
import { figmaAuth, getFigmaFiles, getFileByLink, getFileData } from './figmaAuth';

interface UseFigmaFileState {
  // Authentication state
  isAuthenticated: boolean;
  user: any;
  
  // File loading state
  isLoading: boolean;
  error: string | null;
  
  // File data
  currentFile: any;
  availableFiles: any[];
  projects: any[];
  
  // Actions
  login: () => void;
  logout: () => void;
  loadFiles: () => Promise<void>;
  loadFileByLink: (url: string) => Promise<void>;
  loadFileByKey: (fileKey: string) => Promise<void>;
  clearError: () => void;
}

export function useFigmaFile(): UseFigmaFileState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<any>(null);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Reactive auth state (persisted by figmaAuth)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(figmaAuth.isAuthenticated());
  const [user, setUser] = useState<any>(figmaAuth.getUser());

  const refreshAuth = useCallback(() => {
    try {
      setIsAuthenticated(figmaAuth.isAuthenticated());
      setUser(figmaAuth.getUser());
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    // Initial sync and a couple delayed retries in case IndexedDB loads late
    refreshAuth();
    const t1 = setTimeout(refreshAuth, 200);
    const t2 = setTimeout(refreshAuth, 1200);
    const onFocus = () => refreshAuth();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || /figma/i.test(e.key)) refreshAuth();
    };
    const onAuthUpdated = () => refreshAuth();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      window.addEventListener('storage', onStorage);
      window.addEventListener('figma-auth-updated', onAuthUpdated as any);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('figma-auth-updated', onAuthUpdated as any);
      }
    };
  }, [refreshAuth]);

  // Attempt server-cookie hydration on mount
  useEffect(() => {
    figmaAuth.hydrateFromServerCookie().then(() => refreshAuth());
  }, [refreshAuth]);

  const login = useCallback(() => {
    figmaAuth.loginWithFigma();
  }, []);

  const logout = useCallback(() => {
    figmaAuth.logout();
    setCurrentFile(null);
    setAvailableFiles([]);
    setProjects([]);
    setError(null);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const loadFiles = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const projectsData = await getFigmaFiles();
      setProjects(projectsData);
      
      // Flatten all files from all projects
      const allFiles = projectsData.flatMap(project => 
        project.files.map((file: any) => ({
          ...file,
          projectName: project.name,
          projectId: project.id
        }))
      );
      
      setAvailableFiles(allFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadFileByLink = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔗 loadFileByLink called with URL:', url);
      const fileData = await getFileByLink(url);
      setCurrentFile(fileData);
      console.log('✅ Loaded file by link:', fileData?.name || 'OK');
    } catch (err) {
      console.error('❌ Failed to load file by link:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFileByKey = useCallback(async (fileKey: string) => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fileData = await getFileData(fileKey);
      setCurrentFile(fileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isAuthenticated,
    user,
    isLoading,
    error,
    currentFile,
    availableFiles,
    projects,
    
    // Actions
    login,
    logout,
    loadFiles,
    loadFileByLink,
    loadFileByKey,
    clearError
  };
} 
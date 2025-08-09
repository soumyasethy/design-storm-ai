import { useState, useCallback } from 'react';
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

  const isAuthenticated = figmaAuth.isAuthenticated();
  const user = figmaAuth.getUser();

  const login = useCallback(() => {
    figmaAuth.loginWithFigma();
  }, []);

  const logout = useCallback(() => {
    figmaAuth.logout();
    setCurrentFile(null);
    setAvailableFiles([]);
    setProjects([]);
    setError(null);
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
      const fileData = await getFileByLink(url);
      setCurrentFile(fileData);
    } catch (err) {
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
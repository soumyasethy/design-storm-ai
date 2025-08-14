// Figma OAuth and File Loading System
// Handles OAuth login, file fetching, and direct link processing

import { saveFigmaAuth, loadFigmaAuth, removeFigmaAuth, removeFigmaToken, removeFigmaData, removeFigmaUrl } from './figmaStorage';

interface FigmaUser {
  id: string;
  handle: string;
  img_url: string;
  email: string;
}

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
  created_at: string;
}

interface FigmaProject {
  id: string;
  name: string;
  files: FigmaFile[];
}

interface FigmaFileData {
  document: any;
  components: Record<string, any>;
  componentSets: Record<string, any>;
  styles: Record<string, any>;
  name: string;
  lastModified: string;
  version: string;
  thumbnailUrl?: string;
}

interface FigmaAuthState {
  isAuthenticated: boolean;
  accessToken?: string;
  user?: FigmaUser;
  expiresAt?: number;
}

// Figma OAuth Configuration
const FIGMA_CONFIG = {
  CLIENT_ID:
    process.env.NEXT_PUBLIC_FIGMA_CLIENT_ID ||
    process.env.FIGMA_CLIENT_ID ||
    'your-figma-client-id',
  REDIRECT_URI:
    process.env.NEXT_PUBLIC_FIGMA_REDIRECT_URI ||
    process.env.FIGMA_REDIRECT_URI ||
    'http://localhost:3000/api/auth/figma/callback',
  SCOPE: 'files:read',
  AUTH_URL: 'https://www.figma.com/oauth',
  API_BASE: 'https://api.figma.com/v1',
  STORAGE_KEY: 'figma_auth_state'
};

// Resolve redirect at runtime to current origin when possible (useful in dev when port changes)
const resolveRedirectUri = (): string => {
  try {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/api/auth/figma/callback`;
    }
  } catch {}
  return FIGMA_CONFIG.REDIRECT_URI;
};

class FigmaAuthManager {
  private authState: FigmaAuthState = {
    isAuthenticated: false
  };
  private isInitialized = false;

  constructor() {
    // Don't auto-load auth state - make it lazy
  }

  /**
   * Initialize auth state (called when needed)
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.loadAuthState().catch(error => {
      console.error('Failed to load auth state during initialization:', error);
    });
    this.isInitialized = true;
  }

  /**
   * Start OAuth login flow
   */
  loginWithFigma(): void {
    // Always start OAuth via server so we use FIGMA_* from .env.prod
    try {
      window.location.href = '/api/auth/figma/start';
    } catch {
      // no-op
    }
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  async handleAuthCallback(code: string, state: string): Promise<boolean> {
    try {
      // Verify state parameter
      if (!this.verifyState(state)) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for access token
      console.log('🔄 Exchanging code for token...');
      
      // Call Figma OAuth API directly
      const clientId = FIGMA_CONFIG.CLIENT_ID;
      const clientSecret = process.env.FIGMA_CLIENT_SECRET || '';
      const redirectUri = resolveRedirectUri();
      if (!clientId || !clientSecret) throw new Error('Missing FIGMA client credentials');
      const formBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: 'authorization_code'
      }).toString();

      const tokenUrl = 'https://api.figma.com/v1/oauth/token';
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formBody
      });

      console.log('📡 Token response status:', tokenResponse.status);
      console.log('🔗 Direct Figma API URL: https://www.figma.com/oauth/token');
      
      if (!tokenResponse.ok) {
        const firstErrorText = await tokenResponse.text();
        throw new Error(`Failed to exchange code for token: ${tokenResponse.status} - ${firstErrorText}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Get user info
      const userResponse = await fetch(`${FIGMA_CONFIG.API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userData = await userResponse.json();

      // Save auth state
      this.authState = {
        isAuthenticated: true,
        accessToken: tokenData.access_token,
        user: userData,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      };

      await this.saveAuthState();
      return true;

    } catch (error) {
      console.error('Auth callback error:', error);
      return false;
    }
  }

  /**
   * Get user's Figma files and projects
   */
  async getFigmaFiles(): Promise<FigmaProject[]> {
    if (!this.authState.isAuthenticated || !this.authState.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      // Figma does not provide a top-level /projects listing.
      // We validate the token via /me and return an empty list so the UI can proceed with URL input or explicit file loads.
      const me = await fetch(`${FIGMA_CONFIG.API_BASE}/me`, {
        headers: { 'Authorization': `Bearer ${this.authState.accessToken}` },
        cache: 'no-store',
      });
      if (!me.ok) {
        throw new Error('Failed to validate token');
      }
      return [];

    } catch (error) {
      console.warn('Projects listing not available; continuing without project data.', error);
      return [];
    }
  }

  /**
   * Get files from a specific project
   */
  async getProjectFiles(projectId: string): Promise<FigmaFile[]> {
    if (!this.authState.isAuthenticated || !this.authState.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${FIGMA_CONFIG.API_BASE}/projects/${projectId}/files`, {
        headers: {
          'Authorization': `Bearer ${this.authState.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project files');
      }

      const data = await response.json();
      return data.files || [];

    } catch (error) {
      console.error('Error fetching project files:', error);
      throw error;
    }
  }

  /**
   * Extract file key from Figma URL and fetch file data
   */
  async getFileByLink(url: string): Promise<FigmaFileData> {
    const fileKey = this.extractFileKeyFromUrl(url);
    if (!fileKey) {
      throw new Error('Invalid Figma URL');
    }

    // Prefer authenticated access if available, then fall back to public
    const authenticated = await this.isAuthenticated();
    if (authenticated && this.authState.accessToken) {
      try {
        console.log('🔐 Trying authenticated access for file:', fileKey);
        return await this.getFileData(fileKey);
      } catch {
        console.log('🔄 Authenticated access failed, falling back to public for file:', fileKey);
        return await this.getPublicFileData(fileKey);
      }
    }
    console.log('🌐 Not authenticated, trying public access for file:', fileKey);
    return await this.getPublicFileData(fileKey);
  }

  /**
   * Fetch file data by key
   */
  async getFileData(fileKey: string): Promise<FigmaFileData> {
    const token = this.authState.accessToken;
    if (!token) {
      throw new Error('No access token available');
    }

    try {
      console.log('📄 Fetching file data (auth) for key:', fileKey);
      const figmaUrl = `${FIGMA_CONFIG.API_BASE}/files/${fileKey}`;
      const proxyUrl = `/api/assets?url=${encodeURIComponent(figmaUrl)}`;
      const response = await fetch(proxyUrl, {
        headers: {
          // Forward token; route will set Authorization
          'X-Figma-Token': token
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied - file may be private or you lack permissions');
        } else if (response.status === 404) {
          throw new Error('File not found');
        } else {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
      }

      const fileData = await response.json();
      console.log('📄 File fetched:', fileData?.name);
      
      return {
        document: fileData.document,
        components: fileData.components || {},
        componentSets: fileData.componentSets || {},
        styles: fileData.styles || {},
        name: fileData.name,
        lastModified: fileData.lastModified,
        version: fileData.version,
        thumbnailUrl: fileData.thumbnailUrl
      };

    } catch (error) {
      console.error('Error fetching file data:', error);
      throw error;
    }
  }

  /**
   * Fetch public file data by key (no authentication required)
   */
  async getPublicFileData(fileKey: string): Promise<FigmaFileData> {
    try {
      console.log('🔍 Fetching public file data for:', fileKey);
      
      // For public files, we need to use a different approach
      // Try to fetch the file data using the public API endpoint with a different method
      const figmaUrl = `https://api.figma.com/v1/files/${fileKey}`;
      const proxyUrl = `/api/assets?url=${encodeURIComponent(figmaUrl)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 403) {
          // For public files that return 403, we might need to use a different approach
          // Let's try to get the file data through a different method
          console.log('🔍 Trying alternative method for public file access...');
          return await this.getPublicFileDataAlternative(fileKey);
        } else if (response.status === 404) {
          throw new Error('File not found');
        } else {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
      }

      const fileData = await response.json();
      console.log('✅ Public file data retrieved successfully');
      
      return {
        document: fileData.document,
        components: fileData.components || {},
        componentSets: fileData.componentSets || {},
        styles: fileData.styles || {},
        name: fileData.name,
        lastModified: fileData.lastModified,
        version: fileData.version,
        thumbnailUrl: fileData.thumbnailUrl
      };

    } catch (error) {
      console.error('Error fetching public file data:', error);
      throw error;
    }
  }

  /**
   * Alternative method to fetch public file data
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPublicFileDataAlternative(fileKey: string): Promise<FigmaFileData> {
    try {
      console.log('🔍 Public file requires authentication or is not accessible');
      
      // Instead of trying to scrape the website (which is unreliable),
      // we'll provide a clear error message and suggest authentication
      throw new Error('This Figma file requires authentication. Please log in with your Figma account or use a Personal Access Token to access this file.');

    } catch {
      console.error('Error with public file access');
      throw new Error('Public file access not available - file may require authentication');
    }
  }

  /**
   * Extract file key from various Figma URL formats
   */
  extractFileKeyFromUrl(url: string): string | null {
    const patterns = [
      // Figma file URLs
      /figma\.com\/file\/([a-zA-Z0-9]+)/,
      // Figma prototype URLs
      /figma\.com\/proto\/([a-zA-Z0-9]+)/,
      // Figma design URLs
      /figma\.com\/design\/([a-zA-Z0-9]+)/,
      // Direct file key (if user pastes just the key)
      /^([a-zA-Z0-9]{22,})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    await this.initialize();
    return !!(this.authState.isAuthenticated && 
             this.authState.accessToken && 
             (!this.authState.expiresAt || Date.now() < this.authState.expiresAt));
  }

  /**
   * Get current user info
   */
  async getUser(): Promise<FigmaUser | undefined> {
    await this.initialize();
    return this.authState.user;
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | undefined> {
    await this.initialize();
    return this.authState.accessToken;
  }

  /**
   * Hydrate client auth state from server cookie via API route
   */
  async hydrateFromServerCookie(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch('/api/auth/figma/me', { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.authenticated && data?.access_token) {
        this.authState = {
          isAuthenticated: true,
          accessToken: data.access_token,
          user: data.user,
          // Fallback expiration: 1 hour if not provided
          expiresAt: Date.now() + 60 * 60 * 1000,
        };
        await this.saveAuthState();
        try { window.dispatchEvent(new Event('figma-auth-updated')); } catch {}
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    this.authState = { isAuthenticated: false };
    
    // Clear all stored Figma data and tokens
    if (typeof window !== 'undefined') {
      try {
        // Clear IndexedDB storage
        await removeFigmaAuth();
        await removeFigmaToken();
        await removeFigmaData();
        await removeFigmaUrl();
        
        // Clear localStorage fallback
        localStorage.removeItem(FIGMA_CONFIG.STORAGE_KEY);
        localStorage.removeItem('figmaData');
        localStorage.removeItem('figmaToken');
        localStorage.removeItem('figmaUrl');
        
        // Clear sessionStorage
        sessionStorage.removeItem('figma_oauth_state');
        
        console.log('✅ Cleared all Figma authentication data');
      } catch (error) {
        console.error('❌ Error clearing Figma data:', error);
      }
    }
    
    await this.saveAuthState();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('figma-auth-updated'));
    }
  }

  /**
   * Generate random state for OAuth security
   */
  private generateState(): string {
    const state = Math.random().toString(36).substring(2, 15);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('figma_oauth_state', state);
    }
    return state;
  }

  /**
   * Verify OAuth state parameter
   */
  private verifyState(state: string): boolean {
    if (typeof window === 'undefined') {
      // Server-side: for now, accept any state to avoid issues
      // In production, implement proper server-side state management
      console.warn('⚠️ State verification skipped on server-side');
      return true;
    }
    
    const savedState = sessionStorage.getItem('figma_oauth_state');
    sessionStorage.removeItem('figma_oauth_state');
    return savedState === state;
  }

  /**
   * Save auth state to storage
   */
  private async saveAuthState(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        await saveFigmaAuth(this.authState);
        console.log('✅ Saved auth state to IndexedDB');
      } catch (error) {
        console.error('❌ Failed to save auth state to IndexedDB:', error);
        // Fallback to localStorage
        localStorage.setItem(FIGMA_CONFIG.STORAGE_KEY, JSON.stringify(this.authState));
        console.log('✅ Saved auth state to localStorage (fallback)');
      }
      try { window.dispatchEvent(new Event('figma-auth-updated')); } catch {}
    }
  }

  /**
   * Load auth state from storage
   */
  private async loadAuthState(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const saved = await loadFigmaAuth() as FigmaAuthState;
        if (saved && typeof saved === 'object' && 'isAuthenticated' in saved) {
          this.authState = saved;
          console.log('✅ Loaded auth state from IndexedDB');
          // Check if token is expired
          if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
            await this.logout();
          }
          try { window.dispatchEvent(new Event('figma-auth-updated')); } catch {}
        } else {
          console.log('📭 No auth state found in IndexedDB');
        }
      } catch (error) {
        console.error('❌ Failed to load auth state from IndexedDB:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(FIGMA_CONFIG.STORAGE_KEY);
        if (saved) {
          try {
            this.authState = JSON.parse(saved);
            console.log('✅ Loaded auth state from localStorage (fallback)');
            // Check if token is expired
            if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
              await this.logout();
            }
            try { window.dispatchEvent(new Event('figma-auth-updated')); } catch {}
          } catch (parseError) {
            console.error('Error parsing auth state from localStorage:', parseError);
            await this.logout();
          }
        }
      }
    }
  }
}

// Create singleton instance
export const figmaAuth = new FigmaAuthManager();

// Convenience functions
export const loginWithFigma = () => figmaAuth.loginWithFigma();
export const getFigmaFiles = () => figmaAuth.getFigmaFiles();
export const getFileByLink = (url: string) => figmaAuth.getFileByLink(url);
export const getFileData = (fileKey: string) => figmaAuth.getFileData(fileKey);
export const extractFileKeyFromUrl = (url: string) => figmaAuth.extractFileKeyFromUrl(url);
export const isAuthenticated = async () => await figmaAuth.isAuthenticated();
export const getUser = async () => await figmaAuth.getUser();
export const logout = () => figmaAuth.logout(); 
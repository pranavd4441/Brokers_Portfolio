import { create } from 'zustand';
import { fetchApi, authTokens } from '../lib/api';

export interface TenantBranding {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  whatsapp_default_number: string | null;
  subscription_plan: string;
  plan_status: string;
  pilot_ends_at: string | null;
  referral_code: string | null;
  preferred_locale: 'en' | 'hi' | 'mr';
  theme_mode?: 'LIGHT' | 'DARK';
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'ADMIN' | 'BROKER' | 'ASSISTANT';
  tenant: TenantBranding;
}

interface AuthResponse {
  access: string;
  refresh: string;
  user: UserSession;
}

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<UserSession>;
  signup: (companyName: string, name: string, email: string, password: string, phone: string, options?: {source?: string; city?: string; referralCode?: string; locale?: string; marketingConsent?: boolean}) => Promise<AuthResponse>;
  logout: () => void;
  loadUser: () => Promise<UserSession | null>;
  updateTenantBranding: (branding: Partial<TenantBranding>) => void;
  updateUserProfile: (profile: Pick<UserSession, 'name' | 'phone'>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchApi<AuthResponse>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      const { access, refresh } = response;
      authTokens.setTokens(access, refresh);
      
      // Load full user details to populate tenant branding
      const fullUser = await fetchApi<UserSession>('/auth/me/');
      
      set({ 
        user: fullUser, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return fullUser;
    } catch (err: unknown) {
      set({ 
        error: err instanceof Error ? err.message : 'Login failed. Please check credentials.',
        isLoading: false 
      });
      throw err;
    }
  },

  signup: async (companyName, name, email, password, phone, options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchApi<AuthResponse>('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
          company_name: companyName,
          name,
          email,
          password,
          phone,
          acquisition_source: options.source || 'direct',
          acquisition_city: options.city || 'Pune',
          referral_code: options.referralCode || '',
          preferred_locale: options.locale || 'en',
          marketing_consent: Boolean(options.marketingConsent),
          dpdp_consent: true
        }),
      });
      
      const { access, refresh, user } = response;
      authTokens.setTokens(access, refresh);
      
      set({ 
        user: user as UserSession, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return response;
    } catch (err: unknown) {
      set({ 
        error: err instanceof Error ? err.message : 'Registration failed.',
        isLoading: false 
      });
      throw err;
    }
  },

  logout: () => {
    authTokens.clearTokens();
    set({ 
      user: null, 
      isAuthenticated: false, 
      isLoading: false, 
      error: null 
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  },

  loadUser: async () => {
    const access = authTokens.getAccessToken();
    if (!access) {
      set({ isAuthenticated: false, isLoading: false, user: null });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const fullUser = await fetchApi<UserSession>('/auth/me/');
      set({ 
        user: fullUser, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return fullUser;
    } catch {
      // Access token might be invalid/expired, try to refresh
      authTokens.clearTokens();
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
      return null;
    }
  },

  updateTenantBranding: (brandingData) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          tenant: {
            ...currentUser.tenant,
            ...brandingData
          }
        }
      });
    }
  },

  updateUserProfile: (profile) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...profile } });
    }
  }
}));

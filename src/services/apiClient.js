// WorkTrack API Client with JWT Auth and Auto-Refresh Handling

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('worktrack_access_token'),
  getRefreshToken: () => localStorage.getItem('worktrack_refresh_token'),
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem('worktrack_access_token', access);
    if (refresh) localStorage.setItem('worktrack_refresh_token', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('worktrack_access_token');
    localStorage.removeItem('worktrack_refresh_token');
  },
};

// Generic fetch with auth and auto-refresh on 401
export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const accessToken = tokenStorage.getAccessToken();
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new Error('Unable to connect to WorkTrack backend server. Please verify Django is running on ' + BASE_URL);
  }

  // Handle Token Refresh on 401 Unauthorized
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          tokenStorage.setTokens(refreshData.access, refreshData.refresh || refreshToken);

          // Retry initial request with new access token
          headers.Authorization = `Bearer ${refreshData.access}`;
          const retryRes = await fetch(url, { ...config, headers });
          if (!retryRes.ok) {
            const errData = await retryRes.json().catch(() => ({}));
            throw new Error(errData.detail || errData.message || `Request failed with status ${retryRes.status}`);
          }
          if (retryRes.status === 204) {
            return null;
          }
          return retryRes.json();
        } else {
          // Refresh token expired or revoked
          tokenStorage.clearTokens();
        }
      } catch (e) {
        tokenStorage.clearTokens();
      }
    }
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      } else if (errJson.message) {
        errorDetail = errJson.message;
      } else if (typeof errJson === 'object') {
        const fieldErrors = Object.entries(errJson)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join('; ');
        if (fieldErrors) errorDetail = fieldErrors;
      }
    } catch {
      // not JSON
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Authentication API methods
export const authApi = {
  login: async ({ email, password }) => {
    return apiClient('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData) => {
    return apiClient('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } finally {
      tokenStorage.clearTokens();
    }
  },

  getCurrentUser: async () => {
    return apiClient('/auth/me/', {
      method: 'GET',
    });
  },

  changePassword: async ({ oldPassword, newPassword, confirmNewPassword }) => {
    return apiClient('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      }),
    });
  },

  requestPasswordReset: async ({ email }) => {
    return apiClient('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  confirmPasswordReset: async ({ uid, token, newPassword, confirmNewPassword }) => {
    return apiClient('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      }),
    });
  },
};

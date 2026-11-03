import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { authApi, tokenStorage } from '../services/apiClient';
import { DEMO_MODE } from '../services/demoMode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  // Initialize authentication state: try to restore from storage, otherwise start unauthenticated
  const [authState, setAuthState] = useState(() => {
    const saved = DEMO_MODE ? storageService.getAuthState() : null;
    if (saved) return saved;
    // Default unauthenticated state (no demo user)
    return {
      isAuthenticated: false,
      role: null,
      user: null,
      selectedEmployeeId: null,
      selectedCustomerId: null,
    };
  });

  useEffect(() => {
    if (DEMO_MODE) storageService.saveAuthState(authState);
  }, [authState]);

  // Silently hydrate user from backend if JWT access token exists
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      authApi.getCurrentUser()
        .then((userData) => {
          if (userData && userData.email) {
            const roleLower = (userData.role || 'employee').toLowerCase();
            setAuthState(prev => ({
              ...prev,
              isAuthenticated: true,
              role: roleLower,
              user: {
                id: userData.id,
                name: userData.fullName || userData.email.split('@')[0],
                email: userData.email,
                role: userData.role,
                roleTitle: userData.role === 'ADMIN'
                  ? 'System Administrator'
                  : userData.role === 'EMPLOYEE'
                  ? 'Workforce Field Employee'
                  : 'Authorized Customer Representative',
                avatar: userData.avatar || (prev.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'),
                employeeProfile: userData.employeeProfile,
                customerProfile: userData.customerProfile,
              },
            }));
          }
        })
        .catch(() => {
          // Token expired or server unreachable, fallback silently
        });
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt Real Backend API Authentication
    try {
      const response = await authApi.login({ email: cleanEmail, password });
      const accessToken = response?.access || response?.tokens?.access;
      const refreshToken = response?.refresh || response?.tokens?.refresh;
      if (accessToken && refreshToken) {
        tokenStorage.setTokens(accessToken, refreshToken);
        const userObj = response.user || {};
        const roleLower = (userObj.role || 'employee').toLowerCase();

        const newState = {
          isAuthenticated: true,
          role: roleLower,
          user: {
            id: userObj.id,
            name: userObj.fullName || userObj.email.split('@')[0],
            email: userObj.email,
            role: userObj.role,
            roleTitle: userObj.role === 'ADMIN'
              ? 'Chief Workforce Administrator'
              : userObj.role === 'EMPLOYEE'
              ? 'Workforce Field Employee'
              : 'Authorized Customer Representative',
            avatar: userObj.avatar || (
              roleLower === 'admin'
                ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
                : roleLower === 'employee'
                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
            ),
            employeeProfile: userObj.employeeProfile,
            customerProfile: userObj.customerProfile,
          },
          selectedEmployeeId: userObj.employeeProfile?.id || 'emp-1',
          selectedCustomerId: userObj.customerProfile?.id || 'cust-1',
        };
        setAuthState(newState);
        setLoading(false);
        return { success: true, role: roleLower };
      }
    } catch (apiError) {
      // If backend gave specific invalid credentials error or server was reachable and rejected it
      if (apiError.status === 400 || apiError.status === 401) {
        setLoading(false);
        return { success: false, message: apiError.message || 'Invalid email or password.' };
      }

      // Offline credential shortcuts are available only in explicitly enabled demo builds.
      if (DEMO_MODE && cleanEmail === 'admin@worktrack.demo' && password === 'admin123') {
        const state = {
          isAuthenticated: true,
          role: 'admin',
          user: {
            id: 'admin-1',
            name: 'Alexander Wright',
            email: 'admin@worktrack.demo',
            roleTitle: 'Chief Workforce Administrator',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
          },
          selectedEmployeeId: 'emp-1',
          selectedCustomerId: 'cust-1',
        };
        setAuthState(state);
        setLoading(false);
        return { success: true, role: 'admin' };
      }

      if (DEMO_MODE && cleanEmail === 'employee@worktrack.demo' && password === 'employee123') {
        const state = {
          isAuthenticated: true,
          role: 'employee',
          user: {
            id: 'emp-1',
            name: 'Aarav Shah',
            email: 'employee@worktrack.demo',
            roleTitle: 'Senior Field Engineer',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          },
          selectedEmployeeId: 'emp-1',
          selectedCustomerId: 'cust-1',
        };
        setAuthState(state);
        setLoading(false);
        return { success: true, role: 'employee' };
      }

      if (DEMO_MODE && cleanEmail === 'customer@worktrack.demo' && password === 'customer123') {
        const state = {
          isAuthenticated: true,
          role: 'customer',
          user: {
            id: 'cust-1',
            name: 'Robert Henderson',
            companyName: 'Acme Industries',
            email: 'customer@worktrack.demo',
            roleTitle: 'Client Operations Director',
            avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
          },
          selectedEmployeeId: 'emp-1',
          selectedCustomerId: 'cust-1',
        };
        setAuthState(state);
        setLoading(false);
        return { success: true, role: 'customer' };
      }

      setLoading(false);
      return { success: false, message: apiError.message || 'Authentication failed. Please verify credentials.' };
    }

    setLoading(false);
    return { success: false, message: 'Invalid credentials. Please verify your email and password.' };
  };

  const register = async (registrationData) => {
    setLoading(true);
    try {
      const response = await authApi.register(registrationData);
      const accessToken = response?.access || response?.tokens?.access;
      const refreshToken = response?.refresh || response?.tokens?.refresh;
      if (accessToken && refreshToken) {
        tokenStorage.setTokens(accessToken, refreshToken);
        const userObj = response.user || {};
        const roleLower = (userObj.role || registrationData.role || 'employee').toLowerCase();

        const newState = {
          isAuthenticated: true,
          role: roleLower,
          user: {
            id: userObj.id,
            name: userObj.fullName || registrationData.fullName,
            email: userObj.email,
            role: userObj.role,
            roleTitle: userObj.role === 'EMPLOYEE' ? 'Workforce Field Employee' : 'Authorized Customer Representative',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            employeeProfile: userObj.employeeProfile,
            customerProfile: userObj.customerProfile,
          },
          selectedEmployeeId: userObj.employeeProfile?.id || 'emp-1',
          selectedCustomerId: userObj.customerProfile?.id || 'cust-1',
        };
        setAuthState(newState);
        setLoading(false);
        return { success: true, role: roleLower };
      }
      setLoading(false);
      return { success: true, role: (registrationData.role || 'employee').toLowerCase() };
    } catch (apiError) {
      setLoading(false);
      return { success: false, message: apiError.message || 'Registration failed. Please check inputs.' };
    }
  };

  const quickLoginAs = (role, targetId) => {
    if (!DEMO_MODE) return;
    if (role === 'admin') {
      setAuthState({
        isAuthenticated: true,
        role: 'admin',
        user: {
          id: 'admin-1',
          name: 'Alexander Wright',
          email: 'admin@worktrack.demo',
          roleTitle: 'Chief Workforce Administrator',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        },
        selectedEmployeeId: 'emp-1',
        selectedCustomerId: 'cust-1',
      });
    } else if (role === 'employee') {
      const empId = targetId || 'emp-1';
      const employees = storageService.getEmployees();
      const emp = employees.find(e => e.id === empId) || employees[0];
      setAuthState({
        isAuthenticated: true,
        role: 'employee',
        user: {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          roleTitle: emp.roleTitle,
          avatar: emp.avatar,
        },
        selectedEmployeeId: emp.id,
        selectedCustomerId: emp.assignedCustomerIds?.[0] || 'cust-1',
      });
    } else if (role === 'customer') {
      const custId = targetId || 'cust-1';
      const customers = storageService.getCustomers();
      const cust = customers.find(c => c.id === custId) || customers[0];
      setAuthState({
        isAuthenticated: true,
        role: 'customer',
        user: {
          id: cust.id,
          name: cust.contactPerson,
          companyName: cust.companyName,
          email: cust.email,
          roleTitle: 'Authorized Customer Representative',
          avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        },
        selectedEmployeeId: 'emp-1',
        selectedCustomerId: cust.id,
      });
    }
  };

  const switchPersona = (targetType, targetId) => {
    if (targetType === 'employee') {
      const employees = storageService.getEmployees();
      const emp = employees.find(e => e.id === targetId);
      if (emp) {
        setAuthState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            id: emp.id,
            name: emp.name,
            email: emp.email,
            roleTitle: emp.roleTitle,
            avatar: emp.avatar,
          },
          selectedEmployeeId: emp.id,
          selectedCustomerId: emp.assignedCustomerIds?.[0] || prev.selectedCustomerId,
        }));
      }
    } else if (targetType === 'customer') {
      const customers = storageService.getCustomers();
      const cust = customers.find(c => c.id === targetId);
      if (cust) {
        setAuthState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            id: cust.id,
            name: cust.contactPerson,
            companyName: cust.companyName,
            email: cust.email,
          },
          selectedCustomerId: cust.id,
        }));
      }
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clearTokens();
      setAuthState({
        isAuthenticated: false,
        role: null,
        user: null,
        selectedEmployeeId: null,
        selectedCustomerId: null,
      });
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        loading,
        login,
        register,
        quickLoginAs,
        switchPersona,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

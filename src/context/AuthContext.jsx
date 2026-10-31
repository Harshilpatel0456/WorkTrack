import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Default to Admin or stored auth
  const [authState, setAuthState] = useState(() => {
    const saved = storageService.getAuthState();
    if (saved) return saved;
    return {
      isAuthenticated: true,
      role: 'admin', // default to admin for easy presentation
      user: {
        id: 'admin-1',
        name: 'Alexander Wright',
        email: 'admin@worktrack.demo',
        roleTitle: 'Chief Workforce Administrator',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      },
      selectedEmployeeId: 'emp-1', // Aarav Shah
      selectedCustomerId: 'cust-1', // Acme Industries
    };
  });

  useEffect(() => {
    storageService.saveAuthState(authState);
  }, [authState]);

  const login = (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail === 'admin@worktrack.demo') {
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
      return { success: true, role: 'admin' };
    }

    if (cleanEmail === 'employee@worktrack.demo' || cleanEmail.includes('shah') || cleanEmail.includes('patel') || cleanEmail.includes('mehta')) {
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
      return { success: true, role: 'employee' };
    }

    if (cleanEmail === 'customer@worktrack.demo' || cleanEmail.includes('acme') || cleanEmail.includes('northstar')) {
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
      return { success: true, role: 'customer' };
    }

    return { success: false, message: 'Invalid credentials. Please use the provided demo accounts.' };
  };

  const quickLoginAs = (role, targetId) => {
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

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      role: null,
      user: null,
      selectedEmployeeId: null,
      selectedCustomerId: null,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
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

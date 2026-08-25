import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export interface User {
  id: string;
  email: string;
  role: 'Admin' | 'HR Manager' | 'Employee';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Read persisted user profile on boot
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (err) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // TanStack Query Mutation for logins
  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      const loggedUser = data.user;
      setUser(loggedUser);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      
      // Clear queries cache to fetch fresh data for the newly logged user
      queryClient.clear();
    }
  });

  const login = async (credentials: any) => {
    return loginMutation.mutateAsync(credentials);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};

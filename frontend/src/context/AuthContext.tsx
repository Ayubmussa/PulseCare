import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, setAuthToken } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userType: 'patient' | 'doctor' | 'staff' | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any, userType: 'patient') => Promise<void>;
  logout: () => void;
  updateUserProfile: (userData: Partial<User>) => void;
  resetPassword: (email: string, userType: 'patient' | 'doctor' | 'staff', newPassword: string) => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Storage keys
const USER_STORAGE_KEY = '@PulseCare:user';
const TOKEN_STORAGE_KEY = '@PulseCare:token';
const USER_TYPE_STORAGE_KEY = '@PulseCare:userType';

// Provider component that wraps the app and makes auth available
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'patient' | 'doctor' | 'staff' | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load stored authentication state on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUserType = await AsyncStorage.getItem(USER_TYPE_STORAGE_KEY);

        if (storedUser && storedToken && storedUserType) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          setUserType(storedUserType as 'patient' | 'doctor' | 'staff');
          setAuthToken(storedToken);
        }
      } catch (error) {
        console.error('Failed to load authentication state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // Updated login function that attempts to login with each user type
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Define the order in which to try user types
      const userTypes: ('patient' | 'doctor' | 'staff')[] = ['patient', 'doctor', 'staff'];
      
      let loggedIn = false;
      let lastError = null;
      
      // Try each user type until successful
      for (const type of userTypes) {
        try {
          console.log(`Attempting login as ${type}...`);
          const response = await authService.login(email, password, type);
          
          // If we get here, login was successful
          const { user, token } = response;
          
          // Save to state
          setUser(user);
          setToken(token);
          setUserType(type);
          
          // Set auth header for API calls
          setAuthToken(token);
          
          // Store in AsyncStorage for persistence
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
          await AsyncStorage.setItem(USER_TYPE_STORAGE_KEY, type);
          
          console.log(`Login successful as ${type}`);
          loggedIn = true;
          break;
        } catch (error: any) {
          // If it's not a 404 error (which means "user not found"), 
          // we should not try other user types
          if (error.response && error.response.status !== 404) {
            lastError = error;
            break;
          }
          
          lastError = error;
          console.log(`Login as ${type} failed:`, error.message);
        }
      }
      
      if (!loggedIn) {
        console.error('Login failed for all user types');
        throw lastError || new Error('No user account found with this email.');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function - only allows patient registration
  const register = async (userData: any, type: 'patient') => {
    // Validate that only patient type is allowed to register
    if (type !== 'patient') {
      throw new Error('Only patients can register themselves. Doctors and staff must be created by administrators.');
    }

    try {
      setIsLoading(true);
      
      const user = await authService.register(userData, type);
      
      // After registration, log the user in automatically
      await login(userData.email, userData.password);
      
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string, type: 'patient' | 'doctor' | 'staff', newPassword: string) => {
    try {
      setIsLoading(true);
      await authService.resetPassword(email, type, newPassword);
      // Success response is handled by the component
      return;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear auth header first
      setAuthToken(null);
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove([USER_STORAGE_KEY, TOKEN_STORAGE_KEY, USER_TYPE_STORAGE_KEY]);
      
      // Finally clear state after storage is cleared
      setUser(null);
      setToken(null);
      setUserType(null);
      
      // Ensure a small delay to allow state updates to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Logout completed successfully');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile function
  const updateUserProfile = (userData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    
    // Update in storage
    AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
      .catch(error => console.error('Failed to update user in storage:', error));
  };

  // Context values to be provided
  const value = {
    user,
    userType,
    token,
    isLoading,
    login,
    register,
    logout,
    updateUserProfile,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for using the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
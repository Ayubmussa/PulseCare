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
  resetPassword: (email: string, userType: 'patient' | 'doctor' | 'staff' | null, newPassword: string) => Promise<void>;
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

  // Simplified login function that uses the unified login endpoint
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Call the unified login endpoint that will determine user type
      const response = await authService.login(email, password);
      
      // Extract data from the response
      const { user, token, userType } = response;
      
      // Save to state
      setUser(user);
      setToken(token);
      setUserType(userType);
      
      // Set auth header for API calls
      setAuthToken(token);
      
      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      await AsyncStorage.setItem(USER_TYPE_STORAGE_KEY, userType);
      
      console.log(`Login successful as ${userType}`);
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if this is a Network Error and try with the alternative URL
      if (error instanceof Error && error.message === 'Network Error') {
        try {        console.log('Network error detected during login. Trying with alternative API URL...');
          
          // Import the API URL switching and discovery functions
          const { switchApiBaseUrl, findWorkingApiServer, DEFAULT_DEVICE_URL } = require('../services/api');
          
          // Try the opposite URL setting (if using localhost, switch to IP and vice versa)
          const isCurrentlyUsingLocalhost = await AsyncStorage.getItem('@PulseCare:usingLocalhost');
          const shouldUseIpAddress = isCurrentlyUsingLocalhost !== 'false'; // Default to IP if not set
          
          // Try to find a working server
          const newUrl = await findWorkingApiServer();
          
          // If found, use it
          if (typeof newUrl === 'string') {
            await switchApiBaseUrl(newUrl);
          } else {
            // Fall back to default URL based on device type
            const { DEFAULT_DEVICE_URL } = require('../services/api');
            await switchApiBaseUrl(DEFAULT_DEVICE_URL);
          }
          
          // Store the new setting
          await AsyncStorage.setItem('@PulseCare:usingLocalhost', String(!shouldUseIpAddress));
            console.log(`Switched to ${shouldUseIpAddress ? 'IP address' : 'localhost'} URL`);
          
          try {
            // Try login again with the new URL
            const retryResponse = await authService.login(email, password);
            
            // If successful, update state and storage
            const { user, token, userType } = retryResponse;
            setUser(user);
            setToken(token);
            setUserType(userType);
            setAuthToken(token);            
            // Store user data in AsyncStorage after successful retry
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
            await AsyncStorage.setItem(USER_TYPE_STORAGE_KEY, userType);
          } catch (innerError) {
            console.error('Error during login retry:', innerError);
            throw new Error('Login failed. Please check your connection or credentials and try again.');
          }
          
          console.log(`Login successful after URL switch, logged in as ${userType}`);
          return;
        } catch (retryError) {
          console.error('Login retry also failed:', retryError);
          throw retryError; // If retry fails, throw the new error
        }
      }
      
      throw error; // Throw the original error if not a network error or retry failed
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
  const resetPassword = async (email: string, type: 'patient' | 'doctor' | 'staff' | null, newPassword: string) => {
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
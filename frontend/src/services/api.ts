import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Import the reset utility
import { resetApiUrlPreferences } from '../utils/resetApiUrls';

// Direct utility to get network info when needed
const getNetworkInfo = () => NetInfo.fetch();

// Import helper to specifically clear Android emulator URLs
import { clearEmulatorUrls, forceUseActualIpAddress } from '../utils/clearEmulatorUrls';

// Reset any stored API URLs on app startup to ensure consistent behavior
resetApiUrlPreferences()
  .then(success => {
    if (success) {
      console.log('API URL preferences reset on startup');
    }
    // Also clear any Android emulator URLs
    return clearEmulatorUrls();
  })
  .then(result => {
    if (result.clearedUrls && result.clearedUrls.length > 0) {
      console.log('Found and removed Android emulator URLs');
      return forceUseActualIpAddress();
    }
  })
  .catch(err => {
    console.error('Failed to reset API URL preferences:', err);
  });

// Generate possible server URLs to try
const generatePossibleServerUrls = async (port: number, path: string): Promise<string[]> => {
  // Create URLs with proper formatting
  const LOCALHOST_URL = `http://localhost:${port}${path}`;
  const ACTUAL_IP_URL = `http://192.168.3.24:${port}${path}`;  // Your actual machine IP address
  
  // Return prioritized array of URLs to try (actual IP first for mobile devices)
  const urls = [ACTUAL_IP_URL, LOCALHOST_URL];
  console.log('Generated API URLs to try:', urls);
  return urls;
};

// Set up base URLs for API calls
const API_PORT = 5000;
const API_PATH = '/api';

// Define URLs
const LOCALHOST_URL = 'http://localhost:5000/api';
const ACTUAL_IP_URL = 'http://192.168.3.24:5000/api';  // Your actual machine IP address

// Use the actual IP as default for better mobile device connectivity
const DEFAULT_DEVICE_URL = ACTUAL_IP_URL;

// Function to get all possible URLs to try
const getPossibleApiUrls = async () => {
  // Generate a list of possible server URLs to try
  return await generatePossibleServerUrls(API_PORT, API_PATH);
};

// Store the working API URL
let CURRENT_API_URL = LOCALHOST_URL;

// Function to get the stored API URL preference or use default
const getApiUrl = async () => {
  try {
    // First check if user has manually set a specific URL
    const storedUrl = await AsyncStorage.getItem('@PulseCare:manualApiUrl');
    if (storedUrl) {
      console.log('Using manually configured API URL:', storedUrl);
      return storedUrl;
    }
    
    // Otherwise check if we should use auto-detection or localhost
    const useAutoDetect = await AsyncStorage.getItem('@PulseCare:useAutoDetect');
    
    // If explicitly set to 'false', use localhost
    if (useAutoDetect === 'false') {
      return LOCALHOST_URL;
    }
    
    // Get the stored working URL from previous sessions
    const lastWorkingUrl = await AsyncStorage.getItem('@PulseCare:lastWorkingUrl');
    if (lastWorkingUrl) {
      return lastWorkingUrl;
    }
    
    // If we get here, always prioritize the actual IP address for mobile devices
    console.log('Using actual IP address for connection:', ACTUAL_IP_URL);
    return ACTUAL_IP_URL;
  } catch (error) {
    console.warn('Failed to get API URL preference:', error);
    return ACTUAL_IP_URL; // Default to actual IP as fallback
  }
};

// Create axios instance with default config
const api = axios.create({
  // Base URL will be set in the interceptor
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Store a list of URLs that have been tried and failed
const failedUrls = new Set<string>();

// Function to set a specific API URL manually
export const setManualApiUrl = async (url: string) => {
  if (!url.startsWith('http')) {
    url = `http://${url}`;
  }
  if (!url.endsWith('/api') && !url.endsWith('/api/')) {
    url = `${url}/api`;
  }
  
  try {
    // Test if the URL is valid
    await axios.get(`${url}`, { timeout: 3000 });
    
    // Save the URL if it works
    api.defaults.baseURL = url;
    await AsyncStorage.setItem('@PulseCare:manualApiUrl', url);
    await AsyncStorage.setItem('@PulseCare:lastWorkingUrl', url);
    console.log(`Manual API URL set to: ${url}`);
    
    return { success: true, url };
  } catch (error) {
    console.error(`Failed to connect to manual URL: ${url}`, error);
    return { success: false, error };
  }
};

// Function to switch the API base URL (can be called from your app)
export const switchApiBaseUrl = async (url: string) => {
  api.defaults.baseURL = url;
  CURRENT_API_URL = url;
  await AsyncStorage.setItem('@PulseCare:lastWorkingUrl', url);
  console.log(`API base URL switched to: ${url}`);
  return url;
};

// Function to automatically find a working API server
export const findWorkingApiServer = async (): Promise<string> => {
  const possibleUrls = await getPossibleApiUrls();
  
  // Try each URL in sequence
  for (const url of possibleUrls) {
    // Skip URLs we've already tried and failed
    if (failedUrls.has(url)) continue;
    
    try {
      console.log(`Testing connection to: ${url}`);
      await axios.get(`${url}`, { timeout: 3000 });
      
      // If we get here, the URL works
      console.log(`Found working API server at: ${url}`);
      await switchApiBaseUrl(url);
      
      // Remember this working URL for next time
      await AsyncStorage.setItem('@PulseCare:lastWorkingUrl', url);
      return url;
    } catch (error) {
      console.log(`Failed to connect to: ${url}`);
      failedUrls.add(url);
    }
  }
  
  console.log('Auto-detection unsuccessful, defaulting to actual IP address');
  // Don't return null, always return the actual IP address which should work for devices on the same network
  return ACTUAL_IP_URL;
};

// Initialize API URL on startup with comprehensive safety checks
(async () => {
  let initialUrl = await getApiUrl();
  
  // Check specifically for Android emulator URL (10.0.2.2) and replace it
  // but keep localhost as an option for web browser testing
  const androidEmulatorUrls = ['10.0.2.2'];
  const containsEmulatorUrl = androidEmulatorUrls.some(url => initialUrl.includes(url));
  
  if (containsEmulatorUrl) {
    console.warn('Found Android emulator URL - replacing with actual IP address');
    // Replace with actual IP but keep the port and path
    initialUrl = ACTUAL_IP_URL;
    
    // Clear any stored URLs that might contain emulator references
    try {
      await AsyncStorage.removeItem('@PulseCare:lastWorkingUrl');
      await AsyncStorage.removeItem('@PulseCare:manualApiUrl');
      // Force auto-detection for next time
      await AsyncStorage.setItem('@PulseCare:useAutoDetect', 'true');
    } catch (err) {
      console.error('Error clearing stored URLs:', err);
    }
  }
  
  api.defaults.baseURL = initialUrl;
  CURRENT_API_URL = initialUrl;
  console.log(`Initial API base URL set to: ${initialUrl}`);
})();

// Add request interceptor to ensure correct API URL on every request
api.interceptors.request.use(
  async (config) => {
    // If no baseURL is set, make sure to set it
    if (!config.baseURL) {
      const url = await getApiUrl();
      config.baseURL = url;
    }
    
    // Check if the baseURL contains the Android emulator URL and replace it
    if (config.baseURL && typeof config.baseURL === 'string') {
      if (config.baseURL.includes('10.0.2.2')) {
        console.warn(`Found Android emulator URL in request: ${config.baseURL}`);
        // Replace with actual IP address
        config.baseURL = ACTUAL_IP_URL;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Set up response interceptor for handling network errors
api.interceptors.response.use(
  (response) => response, // Pass successful responses through unchanged
  async (error) => {
    // Only attempt URL switching for network errors
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      // Get the failed request config
      const originalRequest = error.config;
      
      // Skip retry if the URL is explicitly marked to be skipped
      const skipRetry = originalRequest._skipRetry;
      if (skipRetry) {
        return Promise.reject(error);
      }
      
      // Track retry attempts
      originalRequest._retryCount = originalRequest._retryCount || 0;
      
      // Prevent too many retries
      if (originalRequest._retryCount >= 2) {
        console.log('Maximum retry attempts reached, using default URL');
        
        // Don't try anymore, just use the default IP address which should work
        const defaultUrl = ACTUAL_IP_URL;
        
        // Update request with default URL
        const urlPath = originalRequest.url?.replace(originalRequest.baseURL || '', '') || '';
        originalRequest.url = defaultUrl + urlPath;
        originalRequest.baseURL = defaultUrl;
        originalRequest._skipRetry = true; // Prevent further retries
        
        // Retry the request with the default URL
        return axios(originalRequest);
      }
      
      try {
        // Increment retry counter
        originalRequest._retryCount++;
        
        // Remember this failed URL
        const currentUrl = api.defaults.baseURL;
        if (currentUrl) {
          failedUrls.add(currentUrl);
        }
        
        // Try to find a working server
        const newUrl = await findWorkingApiServer();
        
        // Update the request URL to use the new base URL
        const urlPath = originalRequest.url?.replace(originalRequest.baseURL || '', '') || '';
        originalRequest.url = newUrl + urlPath;
        originalRequest.baseURL = newUrl;
        
        console.log(`Retrying request to ${originalRequest.url}`);
        
        // Retry the request with the new URL
        return axios(originalRequest);
      } catch (retryError) {
        console.log('Error during request retry, using actual IP');
        
        // Use the actual IP as a last resort
        const urlPath = originalRequest.url?.replace(originalRequest.baseURL || '', '') || '';
        originalRequest.url = ACTUAL_IP_URL + urlPath;
        originalRequest.baseURL = ACTUAL_IP_URL;
        originalRequest._skipRetry = true; // Prevent further retries
        
        // Retry the request with the actual IP
        return axios(originalRequest);
      }
    }
    
    // For other types of errors, just pass them through
    return Promise.reject(error);
  }
);

// Helper to set JWT token for authenticated requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Authentication services
export const authService = {
  login: async (email: string, password: string) => {
    try {
      console.log(`Attempting unified login for ${email}`);
      
      // Before attempting login, ensure we have a working connection
      if (!api.defaults.baseURL) {
        await findWorkingApiServer();
        if (!api.defaults.baseURL) {
          throw new Error('Unable to connect to server. Please check your network settings.');
        }
      }
      
      // Use the unified login endpoint that will check all user types
      const { data } = await api.post('/auth/login', {
        email,
        password,
      });
      
      console.log(`Login response:`, { 
        userReceived: !!data.user, 
        tokenReceived: !!data.token,
        userType: data.userType
      });

      // Check if we received the required data from the response
      if (!data.user) {
        throw new Error(`Login response missing user data`);
      }
      
      if (!data.token) {
        throw new Error(`Login response missing authentication token`);
      }

      // Ensure the token is applied immediately
      setAuthToken(data.token);
      
      // Return the same response structure to maintain compatibility
      return {
        user: data.user,
        token: data.token,
        userType: data.userType
      };
    } catch (error) {
      console.error(`Error during login:`, error);
        // Provide detailed error information
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        console.error('Login API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: responseData,
          message: error.message,
          url: error.config?.url
        });
        
        // Check if this is a 404 error which might indicate user not found
        if (error.response?.status === 404) {
          throw new Error(`User not found. Please check your email or register if you're new.`);
        }
        
        // Return more user-friendly error message
        if (responseData?.message) {
          throw new Error(`Login failed: ${responseData.message}`);
        }
      }
      throw error;
    }
  },
  register: async (userData: any, userType: 'patient' | 'doctor' | 'staff') => {
    try {
      const endpoint =
        userType === 'patient'
          ? '/patients'
          : userType === 'doctor'
          ? '/doctors'
          : '/staff';
      
      // Make sure we're sending the right field names that the backend expects
      let processedData = { ...userData };
      
      // Enhanced debug logging for staff registration
      if (userType === 'staff') {
        console.log('Staff registration data:', JSON.stringify(processedData, null, 2));
        
        // Validate required fields again before sending
        if (!processedData.name || !processedData.email || !processedData.password || !processedData.role) {
          const missingFields = [];
          if (!processedData.name) missingFields.push('name');
          if (!processedData.email) missingFields.push('email');
          if (!processedData.password) missingFields.push('password');
          if (!processedData.role) missingFields.push('role');
          
          throw new Error(`Missing required staff fields: ${missingFields.join(', ')}`);
        }
      }
      
      console.log(`Registering ${userType} with data:`, processedData);

      const { data } = await api.post(endpoint, processedData);
      return data;
    } catch (error: unknown) {
      // Properly handle unknown error type
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        console.error(`Error in ${userType} registration:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: responseData,
          message: error.message
        });
        
        // Rethrow with more detailed message for better user feedback
        if (responseData?.message) {
          throw new Error(`Registration failed: ${responseData.message}`);
        }
      } else {
        console.error(`Error in ${userType} registration:`, error instanceof Error ? error.message : 'An unknown error occurred');
      }
      throw error;
    }
  },
  resetPassword: async (email: string, userType: 'patient' | 'doctor' | 'staff' | null, newPassword: string) => {
    try {
      // If userType is null, use the unified endpoint
      if (userType === null) {
        const { data } = await api.post('/auth/reset-password', { email, newPassword });
        return data;
      } else {
        // Otherwise use the type-specific endpoint (legacy support)
        let endpoint: string;
        switch (userType) {
          case 'patient':
            endpoint = '/patients/reset-password';
            break;
          case 'doctor':
            endpoint = '/doctors/reset-password';
            break;
          case 'staff':
            endpoint = '/staff/reset-password';
            break;
          default:
            throw new Error('Invalid user type');
        }
        const { data } = await api.post(endpoint, { email, newPassword });
        return data;
      }
    } catch (error) {
      // Enhance error logging
      if (axios.isAxiosError(error)) {
        console.error('Password reset error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw error;
    }
  },
};

// Patient services
export const patientService = {
  getAllPatients: async () => {
    try {
      const { data } = await api.get('/patients');
      return data;
    } catch (error) {
      throw error;
    }
  },
  getPatientById: async (id: string) => {
    try {
      const { data } = await api.get(`/patients/${id}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  updatePatient: async (id: string, patientData: any) => {
    try {
      const { data } = await api.put(`/patients/${id}`, patientData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getPatientMedicalHistory: async (id: string) => {
    try {
      const { data } = await api.get(`/patients/${id}/medical-history`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getPatientAppointments: async (id: string) => {
    try {
      const { data } = await api.get(`/patients/${id}/appointments`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getPatientDocuments: async (id: string) => {
    try {
      const { data } = await api.get(`/patients/${id}/documents`);
      return data;
    } catch (error) {
      throw error;
    }
  },
};

// Doctor services
export const doctorService = {
  getAllDoctors: async () => {
    try {
      const { data } = await api.get('/doctors');
      return data;
    } catch (error) {
      throw error;
    }
  },
  getDoctorById: async (id: string) => {
    try {
      const { data } = await api.get(`/doctors/${id}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  updateDoctor: async (id: string, doctorData: any) => {
    try {
      const { data } = await api.put(`/doctors/${id}`, doctorData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getDoctorAppointments: async (id: string) => {
    try {
      const { data } = await api.get(`/doctors/${id}/appointments`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getDoctorPatients: async (id: string) => {
    try {
      const { data } = await api.get(`/doctors/${id}/patients`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  updateAvailability: async (id: string, availabilityData: any) => {
    try {
      const { data } = await api.put(`/doctors/${id}/availability`, availabilityData);
      return data;
    } catch (error) {
      throw error;
    }
  },
};

// Appointment services
export const appointmentService = {
  getAllAppointments: async () => {
    try {
      const { data } = await api.get('/appointments');
      return data;
    } catch (error) {
      throw error;
    }
  },
  getAppointmentById: async (id: string) => {
    try {
      const { data } = await api.get(`/appointments/${id}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  createAppointment: async (appointmentData: any) => {
    try {
      const { data } = await api.post('/appointments', appointmentData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  updateAppointment: async (id: string, appointmentData: any) => {
    try {
      console.log(`API: Updating appointment ${id} with data:`, appointmentData);
      
      // Make the API call
      const response = await api.put(`/appointments/${id}`, appointmentData);
      console.log(`API: Update appointment ${id} successful, response:`, response.data);
      
      return response.data;
    } catch (error) {
      console.error(`API: Failed to update appointment ${id}:`, error);
      
      // Provide more detailed error information
      if (axios.isAxiosError(error)) {
        console.error('API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      }
      
      throw error;
    }
  },
  deleteAppointment: async (id: string) => {
    try {
      await api.delete(`/appointments/${id}`);
    } catch (error) {
      throw error;
    }
  },
  getAppointmentsByDateRange: async (startDate: string, endDate: string) => {
    try {
      // Fix: The backend route uses query parameters on the base endpoint
      const { data } = await api.get(`/appointments?startDate=${startDate}&endDate=${endDate}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getPatientAppointments: async (patientId: string) => {
    try {
      const { data } = await api.get(`/appointments/patient/${patientId}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  cancelAppointment: async (id: string) => {
    try {
      console.log(`API: Cancelling appointment ${id}`);
      
      // First try the dedicated cancellation endpoint
      const response = await api.put(`/appointments/${id}/cancel`, {});
      console.log(`API: Cancel appointment ${id} success response:`, response.data);
      
      return response.data;
    } catch (error) {
      console.error(`API: Failed to cancel appointment ${id} using dedicated endpoint:`, error);
      
      // Handle errors but attempt a direct update as fallback
      try {
        console.log(`API: Attempting fallback direct update for appointment ${id}`);
        const fallbackResponse = await api.put(`/appointments/${id}`, { 
          status: 'cancelled',
          cancelled_at: new Date().toISOString() 
        });
        console.log(`API: Fallback success for appointment ${id}:`, fallbackResponse.data);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error(`API: All cancellation attempts failed for appointment ${id}:`, fallbackError);
        throw fallbackError;
      }
    }
  },
};

// Staff services
export const staffService = {
  // Doctor Management
  getAllDoctors: async (filters?: { status?: string; specialty?: string }) => {
    try {
      let url = '/staff/manage/doctors';
      if (filters) {
        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.specialty) queryParams.append('specialty', filters.specialty);
        if (queryParams.toString()) url += `?${queryParams.toString()}`;
      }
      const { data } = await api.get(url);
      return data;
    } catch (error) {
      throw error;
    }
  },

  getDoctorById: async (id: string) => {
    try {
      const { data } = await api.get(`/staff/manage/doctors/${id}`);
      return data;
    } catch (error) {
      throw error;
    }
  },

  getDoctorRegistrations: async () => {
    try {
      const { data } = await api.get('/staff/manage/doctors/registrations');
      return data;
    } catch (error) {
      throw error;
    }
  },

  approveDoctor: async (doctorId: string, staffId: string, comments?: string) => {
    try {
      const { data } = await api.put(`/staff/manage/doctors/${doctorId}/approve`, {
        staffId,
        comments,
      });
      return data;
    } catch (error) {
      throw error;
    }
  },

  rejectDoctor: async (doctorId: string, staffId: string, reason: string) => {
    try {
      const { data } = await api.put(`/staff/manage/doctors/${doctorId}/reject`, {
        staffId,
        reason,
      });
      return data;
    } catch (error) {
      throw error;
    }
  },

  updateDoctorStatus: async (
    doctorId: string,
    status: 'active' | 'inactive',
    staffId: string,
    reason?: string
  ) => {
    try {
      const { data } = await api.put(`/staff/manage/doctors/${doctorId}/status`, {
        status,
        staffId,
        reason,
      });
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Patient Management
  getAllPatients: async () => {
    try {
      const { data } = await api.get('/staff/manage/patients');
      return data;
    } catch (error) {
      throw error;
    }
  },

  updatePatientStatus: async (
    patientId: string,
    status: 'active' | 'inactive',
    staffId: string,
    reason?: string
  ) => {
    try {
      const { data } = await api.put(`/staff/manage/patients/${patientId}/status`, {
        status,
        staffId,
        reason,
      });
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Appointment Oversight
  getStaffAppointments: async (
    filters?: { date?: string; status?: string; doctorId?: string; patientId?: string }
  ) => {
    try {
      let url = '/staff/manage/appointments';
      if (filters) {
        const queryParams = new URLSearchParams();
        if (filters.date) queryParams.append('date', filters.date);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.doctorId) queryParams.append('doctor_id', filters.doctorId);
        if (filters.patientId) queryParams.append('patient_id', filters.patientId);
        if (queryParams.toString()) url += `?${queryParams.toString()}`;
      }
      const { data } = await api.get(url);
      return data;
    } catch (error) {
      throw error;
    }
  },

  getAppointmentById: async (id: string) => {
    try {
      const { data } = await api.get(`/staff/manage/appointments/${id}`);
      return data;
    } catch (error) {
      throw error;
    }
  },

  updateAppointmentStatus: async (
    id: string,
    status: 'scheduled' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled' | 'no-show',
    staffId: string,
    notes?: string
  ) => {
    try {
      const { data } = await api.put(`/staff/manage/appointments/${id}/status`, {
        status,
        staffId,
        notes,
      });
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Clinic Management
  getClinicInfo: async () => {
    try {
      const { data } = await api.get('/staff/manage/clinic');
      return data;
    } catch (error) {
      throw error;
    }
  },

  updateClinicInfo: async (clinicData: any) => {
    try {
      const { data } = await api.put('/staff/manage/clinic', clinicData);
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Staff Management
  getAllStaff: async () => {
    try {
      const { data } = await api.get('/staff');
      return data;
    } catch (error) {
      throw error;
    }
  },

  getStaffById: async (staffId: string) => {
    try {
      const { data } = await api.get(`/staff/${staffId}`);
      return data;
    } catch (error) {
      throw error;
    }
  },

  updateStaff: async (staffId: string, staffData: any) => {
    try {
      const { data } = await api.put(`/staff/${staffId}`, staffData);
      return data;
    } catch (error) {
      throw error;
    }
  },
};

// Chat services
export const chatService = {
  getChatMessages: async (senderId: string, recipientId: string) => {
    try {
      const { data } = await api.get(`/chat/messages?sender_id=${senderId}&recipient_id=${recipientId}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getConversationMessages: async (conversationId: string, userId?: string) => {
    try {
      if (!userId) {
        console.warn('User ID not provided for getConversationMessages, using legacy endpoint');
        const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
        return data;
      }

      console.log(`Fetching messages between user ${userId} and conversation ${conversationId}`);
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages/${userId}`);
      return data;
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },  sendMessage: async (senderId: string, text: string, recipientId: string, senderType?: 'patient' | 'doctor' | 'staff') => {
    try {
      console.log(`Sending message with ID ${senderId} to recipient ${recipientId}`);
      
      // Determine sender type if not provided
      // This is a simple heuristic - in a real app you might want to pass this explicitly
      const determinedSenderType = senderType || 'patient'; // Default to patient for backward compatibility
      
      const messageData = {
        sender_id: senderId,
        recipient_id: recipientId,
        sender_type: determinedSenderType,
        content: text
      };
      
      console.log('Message data being sent:', messageData);
      
      const { data } = await api.post('/chat/messages', messageData);
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  markMessagesAsRead: async (conversationId: string, messageIds: string[]) => {
    try {
      const { data } = await api.put(`/chat/messages/read`, {
        conversationId,
        messageIds,
      });
      return data;
    } catch (error) {
      throw error;
    }
  },  subscribeToConversation: (conversationId: string, callback: (event: any) => void) => {
    // Mock implementation until WebSocket server is implemented
    console.log(`Mock WebSocket: Subscribing to conversation: ${conversationId}`);
    
    // Return mock subscription with cleanup method
    return {
      unsubscribe: () => {
        console.log(`Mock WebSocket: Unsubscribing from conversation: ${conversationId}`);
      },
    };
  },
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => {
    // Mock implementation for typing indicator
    console.log(`Mock WebSocket: User is ${isTyping ? 'typing' : 'not typing'} in conversation ${conversationId}`);
  },
  getUserConversations: async (userId: string, userType: 'patient' | 'doctor') => {
    try {
      const { data } = await api.get(`/chat/conversations/${userId}/${userType}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  deleteMessage: async (id: string) => {
    try {
      await api.delete(`/chat/messages/${id}`);
    } catch (error) {
      throw error;
    }
  },
};

// Document services
export const documentService = {
  getAllDocuments: async (filters?: { patient_id?: string; doctor_id?: string }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.patient_id) queryParams.append('patient_id', filters.patient_id);
      if (filters?.doctor_id) queryParams.append('doctor_id', filters.doctor_id);

      const { data } = await api.get(`/documents?${queryParams}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getDocumentById: async (id: string) => {
    try {
      const { data } = await api.get(`/documents/${id}`);
      return data;
    } catch (error) {
      throw error;
    }
  },  uploadDocument: async (documentData: any, file?: any) => {
    try {
      // Handle file uploads with FormData if a file is provided
      if (file) {
        // Validate file object has required properties
        if (!file.uri || !file.type || !file.name) {
          throw new Error('Invalid file format: Missing required file properties (uri, type, or name)');
        }
        
        // Create FormData object for multipart/form-data uploads
        const formData = new FormData();
        
        // Add all document metadata
        Object.keys(documentData).forEach(key => {
          formData.append(key, documentData[key]);
        });
        
        // Add the file to the form data
        formData.append('document', file as any);
        
        // Log upload info (but limit URI length in logs)
        console.log('Uploading document:', {
          documentType: documentData.document_type || 'unknown',
          fileName: file.name,
          fileType: file.type
        });
        
        // Send multipart request with correct content type header
        const { data } = await api.post('/documents', formData, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
        return data;
      } 
      
      // For metadata-only uploads, use standard JSON
      const { data } = await api.post('/documents', documentData);
      return data;
      
    } catch (error) {
      // Enhanced error reporting
      console.error('Document upload failed:', error instanceof Error ? error.message : 'Unknown error');
      
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(`Upload failed: ${error.response.data.message}`);
      }
      throw error;
    }
  },
  updateDocument: async (id: string, documentData: any) => {
    try {
      const { data } = await api.put(`/documents/${id}`, documentData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  deleteDocument: async (id: string) => {
    try {
      await api.delete(`/documents/${id}`);
    } catch (error) {
      throw error;
    }
  },
  getDocumentsByType: async (patientId: string, documentType: string) => {
    try {
      // Fix: The backend expects query parameters on base endpoint, not a /type path
      const { data } = await api.get(
        `/documents?patient_id=${patientId}&document_type=${documentType}`
      );
      return data;
    } catch (error) {
      throw error;
    }
  },
};

// Medical History services
export const medicalHistoryService = {
  getAllMedicalHistory: async (filters?: { patient_id?: string; doctor_id?: string }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.patient_id) queryParams.append('patient_id', filters.patient_id);
      if (filters?.doctor_id) queryParams.append('doctor_id', filters.doctor_id);

      const { data } = await api.get(`/medical-history?${queryParams}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getMedicalHistoryById: async (id: string) => {
    try {
      const { data } = await api.get(`/medical-history/${id}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  createMedicalHistory: async (historyData: any) => {
    try {
      const { data } = await api.post('/medical-history', historyData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  updateMedicalHistory: async (id: string, historyData: any) => {
    try {
      const { data } = await api.put(`/medical-history/${id}`, historyData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  deleteMedicalHistory: async (id: string) => {
    try {
      await api.delete(`/medical-history/${id}`);
    } catch (error) {
      throw error;
    }
  },
  getMedicalHistoryByDateRange: async (patientId: string, startDate: string, endDate: string) => {
    try {
      // Fix: The backend expects these as query parameters on the main endpoint
      const queryParams = new URLSearchParams({
        patient_id: patientId,
        startDate: startDate,
        endDate: endDate,
      });
      const { data } = await api.get(`/medical-history?${queryParams}`);
      return data;
    } catch (error) {
      throw error;
    }
  },
};

// Clinic services
export const clinicService = {
  getClinicInfo: async () => {
    try {
      const { data } = await api.get('/clinic');
      return data;
    } catch (error) {
      throw error;
    }
  },
  updateClinicInfo: async (clinicData: any) => {
    try {
      const { data } = await api.put('/clinic', clinicData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  updateOperatingHours: async (hoursData: any) => {
    try {
      const { data } = await api.put('/clinic/hours', hoursData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  getStaffMembers: async () => {
    try {
      const { data } = await api.get('/staff');
      return data;
    } catch (error) {
      throw error;
    }
  },
  getServices: async () => {
    try {
      const { data } = await api.get('/clinic/services');
      return data;
    } catch (error) {
      throw error;
    }
  },
  updateService: async (serviceId: string, serviceData: any) => {
    try {
      const { data } = await api.put(`/clinic/services/${serviceId}`, serviceData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  addService: async (serviceData: any) => {
    try {
      const { data } = await api.post('/clinic/services', serviceData);
      return data;
    } catch (error) {
      throw error;
    }
  },
  deleteService: async (serviceId: string) => {
    try {
      await api.delete(`/clinic/services/${serviceId}`);
    } catch (error) {
      throw error;
    }
  },
};

export default api;
import axios from 'axios';

// Set up base URL for API calls
const API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  login: async (email: string, password: string, userType: 'patient' | 'doctor' | 'staff') => {
    try {
      let endpoint: string;

      switch (userType) {
        case 'patient':
          endpoint = '/patients/login';
          break;
        case 'doctor':
          endpoint = '/doctors/login';
          break;
        case 'staff':
          endpoint = '/staff/login';
          break;
        default:
          throw new Error('Invalid user type');
      }

      const { data } = await api.post(endpoint, {
        email,
        password,
      });

      // The response should contain user data, token, and userType
      return {
        user: data.user,
        token: data.token,
        userType: userType, // Use the userType from the request
      };
    } catch (error) {
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
  resetPassword: async (email: string, userType: 'patient' | 'doctor' | 'staff', newPassword: string) => {
    try {
      // Determine the endpoint based on user type
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
    } catch (error) {
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
      
      // Make a dedicated call for cancellation
      const response = await api.put(`/appointments/${id}/cancel`, { status: 'cancelled' });
      console.log(`API: Cancel appointment ${id} success response:`, response.data);
      
      return response.data;
    } catch (error) {
      console.error(`API: Failed to cancel appointment ${id}:`, error);
      
      // Handle errors but attempt a direct update as fallback
      try {
        console.log(`API: Attempting fallback direct update for appointment ${id}`);
        const fallbackResponse = await api.put(`/appointments/${id}`, { status: 'cancelled' });
        console.log(`API: Fallback success for appointment ${id}:`, fallbackResponse.data);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error(`API: Fallback also failed for appointment ${id}:`, fallbackError);
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
  getConversationMessages: async (conversationId: string) => {
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages`);
      return data;
    } catch (error) {
      throw error;
    }
  },
  sendMessage: async (senderId: string, text: string, recipientId: string) => {
    try {
      console.log(`Sending message with ID ${senderId} to recipient ${recipientId}`);
      
      const messageData = {
        sender_id: senderId,
        recipient_id: recipientId,
        sender_type: 'patient',
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
  },
  subscribeToConversation: (conversationId: string, callback: (event: any) => void) => {
    // This would use WebSockets in a real implementation
    // For now, return a mock subscription object
    console.log(`Subscribing to conversation: ${conversationId}`);

    // Set up the connection to the WebSocket server here

    return {
      unsubscribe: () => {
        console.log(`Unsubscribing from conversation: ${conversationId}`);
        // Clean up WebSocket connection here
      },
    };
  },
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => {
    // This would use WebSockets in a real implementation
    console.log(
      `Sending typing indicator for conversation ${conversationId}: ${
        isTyping ? 'typing' : 'stopped typing'
      }`
    );
    // Send typing indicator via WebSocket here
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
  },
  uploadDocument: async (documentData: any, file?: any) => {
    try {
      if (file) {
        // If we have a file, use FormData to handle the upload
        const formData = new FormData();
        
        // Add document metadata
        Object.keys(documentData).forEach(key => {
          formData.append(key, documentData[key]);
        });
        
        // Add the file - ensure it's properly formatted for multer on the backend
        // The file object must contain: uri, type, and name properties
        if (typeof file === 'object' && file.uri && file.type && file.name) {
          formData.append('document', file as any);
          
          console.log('Uploading document with FormData:', {
            metadata: documentData,
            fileInfo: {
              name: file.name,
              type: file.type,
              uriPreview: file.uri.substring(0, 50) + '...' // Log just part of URI for debugging
            }
          });
        } else {
          console.error('Invalid file object for upload:', file);
          throw new Error('Invalid file format');
        }
        
        // Need to use a different content type for multipart/form-data
        const { data } = await api.post('/documents', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return data;
      } else {
        // If we just have metadata, proceed with the standard JSON request
        const { data } = await api.post('/documents', documentData);
        return data;
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        console.error('API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: responseData,
          message: error.message
        });
        
        // Throw with more detailed error message
        if (responseData?.message) {
          throw new Error(`Upload failed: ${responseData.message}`);
        }
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
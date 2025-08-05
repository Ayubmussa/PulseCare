import axios from 'axios';
import { 
  User, 
  RegisterData, 
  LoginResponse, 
  Doctor, 
  Appointment, 
  MedicalRecord, 
  Document, 
  ChatMessage, 
  Conversation 
} from '../types';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/patients/login', { email, password });
    return response.data;
  },

  async register(userData: RegisterData): Promise<LoginResponse> {
    const response = await api.post('/patients', userData);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(userId: string, userData: Partial<User>): Promise<User> {
    const response = await api.put(`/patients/${userId}`, userData);
    return response.data;
  },

  async resetPassword(email: string): Promise<{ message: string }> {
    const response = await api.post('/patients/reset-password', { email });
    return response.data;
  },
};

// Doctor Service
export const doctorService = {
  async getAllDoctors(): Promise<Doctor[]> {
    const response = await api.get('/doctors');
    return response.data;
  },

  async getDoctorById(doctorId: string): Promise<Doctor> {
    const response = await api.get(`/doctors/${doctorId}`);
    return response.data;
  },

  async getDoctorsBySpecialty(specialty: string): Promise<Doctor[]> {
    const response = await api.get(`/doctors?specialty=${specialty}`);
    return response.data;
  },

  async getDoctorAvailability(doctorId: string, date: string): Promise<string[]> {
    const response = await api.get(`/doctors/${doctorId}/availability?date=${date}`);
    return response.data;
  },
};

// Appointment Service
export const appointmentService = {
  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    const response = await api.get(`/patients/${patientId}/appointments`);
    return response.data;
  },

  async bookAppointment(appointmentData: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    notes?: string;
  }): Promise<Appointment> {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },

  async cancelAppointment(appointmentId: string): Promise<{ message: string }> {
    const response = await api.put(`/appointments/${appointmentId}/cancel`);
    return response.data;
  },

  async rescheduleAppointment(appointmentId: string, newDate: string, newTime: string): Promise<Appointment> {
    const response = await api.put(`/appointments/${appointmentId}/reschedule`, {
      date: newDate,
      time: newTime,
    });
    return response.data;
  },

  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    const response = await api.get(`/appointments/${appointmentId}`);
    return response.data;
  },
};

// Medical Records Service
export const medicalRecordsService = {
  async getPatientMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
    const response = await api.get(`/patients/${patientId}/medical-history`);
    return response.data;
  },

  async getMedicalRecordById(recordId: string): Promise<MedicalRecord> {
    const response = await api.get(`/medical-history/${recordId}`);
    return response.data;
  },
};

// Documents Service
export const documentsService = {
  async getPatientDocuments(patientId: string): Promise<Document[]> {
    const response = await api.get(`/documents?patient_id=${patientId}`);
    
    // Transform backend response to frontend format
    const transformedData = response.data.map((doc: any) => ({
      ...doc,
      patientId: doc.patient_id || doc.patientId,
      name: doc.document_name || doc.name,
      type: doc.document_type || doc.type,
      url: doc.document_url || doc.url,
      uploadDate: doc.created_at || doc.uploadDate,
      size: doc.size || 0, // Default if not provided
    }));
    
    return transformedData;
  },

  async uploadDocument(patientId: string, file: File, documentType?: string, notes?: string): Promise<Document> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('patient_id', patientId);
    formData.append('document_name', file.name);
    formData.append('document_type', documentType || 'general');
    if (notes) {
      formData.append('notes', notes);
    }

    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Transform response to frontend format
    const doc = response.data;
    return {
      ...doc,
      patientId: doc.patient_id || doc.patientId,
      name: doc.document_name || doc.name,
      type: doc.document_type || doc.type,
      url: doc.document_url || doc.url,
      uploadDate: doc.created_at || doc.uploadDate,
      size: doc.size || 0,
    };
  },

  async deleteDocument(documentId: string): Promise<{ message: string }> {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },

  async updateDocument(documentId: string, updates: { document_name?: string; document_type?: string; notes?: string }): Promise<Document> {
    const response = await api.put(`/documents/${documentId}`, updates);
    
    // Transform response to frontend format
    const doc = response.data;
    return {
      ...doc,
      patientId: doc.patient_id || doc.patientId,
      name: doc.document_name || doc.name,
      type: doc.document_type || doc.type,
      url: doc.document_url || doc.url,
      uploadDate: doc.created_at || doc.uploadDate,
      size: doc.size || 0,
    };
  },
};

// Chat Service
export const chatService = {
  async getUserConversations(userId: string, userType: 'patient' | 'doctor' = 'patient'): Promise<Conversation[]> {
    const response = await api.get(`/chat/conversations/${userId}/${userType}`);
    return response.data;
  },

  async getChatMessages(senderId: string, recipientId: string): Promise<ChatMessage[]> {
    const response = await api.get(`/chat/messages?sender_id=${senderId}&recipient_id=${recipientId}`);
    return response.data;
  },

  async sendMessage(senderId: string, recipientId: string, message: string): Promise<ChatMessage> {
    const response = await api.post('/chat/messages', {
      sender_id: senderId,
      recipient_id: recipientId,
      message: message
    });
    return response.data;
  },

  async markMessagesAsRead(senderId: string, recipientId: string): Promise<{ message: string }> {
    const response = await api.put('/chat/messages/read', {
      sender_id: senderId,
      recipient_id: recipientId
    });
    return response.data;
  },

  async deleteMessage(messageId: string): Promise<{ message: string }> {
    const response = await api.delete(`/chat/messages/${messageId}`);
    return response.data;
  },
};

export default api;

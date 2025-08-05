// Shared types for the PulseCare application

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  profilePicture?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  date_of_birth?: string; // Backend expects this field name
  dateOfBirth?: string; // Keep for compatibility
  gender?: string;
  address?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  message: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  experience: number;
  education?: string; // Backend field for qualifications
  qualifications?: string; // Computed field for compatibility
  bio?: string;
  officeHours?: string;
  officeLocation?: string;
  officePhone?: string;
  acceptingNewPatients?: boolean;
  image?: string; // Backend field name
  profileImage?: string; // Computed field for compatibility
  rating: number;
  reviewCount?: number;
  consultationFee?: number; // May not be in backend, add default
  address?: string; // Computed from officeLocation
  availability?: any; // Backend stores as JSON
  created_at?: string;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  consultationFee: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  treatment: string;
  medications: Medication[];
  notes?: string;
  prescription?: string;
  symptoms?: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Document {
  id: string;
  patient_id?: string; // Backend field name
  patientId?: string; // Frontend compatibility
  document_name?: string; // Backend field name  
  name?: string; // Frontend compatibility
  document_type?: string; // Backend field name
  type?: string; // Frontend compatibility
  document_url?: string; // Backend field name
  url?: string; // Frontend compatibility
  fileUrl?: string; // Alternative property name for backward compatibility
  uploadDate?: string;
  created_at?: string; // Backend field name
  size?: number;
  doctor_id?: string; // Backend field
  notes?: string; // Backend field
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  receiverId?: string;
  senderName: string;
  senderType: 'patient' | 'doctor';
  message: string;
  timestamp: string;
  type?: 'text' | 'image' | 'file';
  isRead: boolean;
}

export interface Conversation {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface ChatRoom {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

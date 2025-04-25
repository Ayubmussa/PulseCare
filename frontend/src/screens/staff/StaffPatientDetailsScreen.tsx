import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { patientService, appointmentService, staffService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Define types for route parameters and navigation
type RootStackParamList = {
  MedicalRecords: { patientId: string; patientName: string };
  ScheduleAppointment: { patientId: string; patientName: string };
  StaffPatientDetails: { patientId: string; patientName: string };
};

type StaffPatientDetailsRouteProp = RouteProp<RootStackParamList, 'StaffPatientDetails'>;
type StaffPatientDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define interfaces for data structures
interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  status: 'active' | 'inactive';
  image?: string;
  emergencyContact?: string;
  assignedDoctor?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  bloodType?: string;
  allergies?: string[];
  medicalConditions?: string[];
  medications?: Medication[];
  notes?: string;
}

interface Appointment {
  id: string;
  date: string;
  status: string;
  patientId: string;
  doctorId: string;
  reason?: string;
  notes?: string;
}

const StaffPatientDetailsScreen: React.FC = () => {
  const route = useRoute<StaffPatientDetailsRouteProp>();
  const navigation = useNavigation<StaffPatientDetailsNavigationProp>();
  const { user } = useAuth();
  const { patientId, patientName } = route.params;
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  
  // Patient data state
  const [patient, setPatient] = useState<Patient | null>(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [lastVisit, setLastVisit] = useState<Appointment | null>(null);

  // Fetch patient from API when component mounts
  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  const fetchPatientDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch patient details directly from patientService since staffService doesn't have this method
      const patientData = await patientService.getPatientById(patientId);
      setPatient(patientData);

      // Get patient's appointments using general appointment service
      const allAppointments = await appointmentService.getAllAppointments();
      const appointments = allAppointments.filter((apt: Appointment) => apt.patientId === patientId);
      
      // Find upcoming appointment
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureAppointments = appointments
        .filter((apt: Appointment) => {
          // Ensure proper date comparison
          const appointmentDate = new Date(apt.date);
          return appointmentDate >= today && 
            (apt.status === 'scheduled' || apt.status === 'confirmed');
        })
        .sort((a: Appointment, b: Appointment) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
      if (futureAppointments.length > 0) {
        setUpcomingAppointment(futureAppointments[0]);
      }
      
      // Find last visit (most recent past appointment)
      const pastAppointments = appointments
        .filter((apt: Appointment) => {
          // Ensure proper date comparison
          const appointmentDate = new Date(apt.date);
          return appointmentDate < today && apt.status === 'completed';
        })
        .sort((a: Appointment, b: Appointment) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
      if (pastAppointments.length > 0) {
        setLastVisit(pastAppointments[0]);
      }
      
    } catch (error) {
      console.error('Error fetching patient details:', error);
      setError('Failed to load patient information. Please try again later.');
      Alert.alert('Error', 'Failed to load patient information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (field: string, value: string): void => {
    setEditField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!patient) {
      Alert.alert('Error', 'Patient information not available');
      return;
    }
    
    try {
      setSaving(true);
      
      // Create updated patient object with the edited field
      const updateData = { [editField]: editValue };
      
      // Call the API to update the patient using patientService
      await patientService.updatePatient(patientId, updateData);
      
      // Update local state
      setPatient({
        ...patient,
        [editField]: editValue
      });
      
      setEditModalVisible(false);
      Alert.alert('Updated', `${editField.charAt(0).toUpperCase() + editField.slice(1)} has been updated successfully.`);
    } catch (error) {
      console.error('Error updating patient:', error);
      Alert.alert('Error', 'Failed to update patient information. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: 'active' | 'inactive'): Promise<void> => {
    if (!patient || !user?.id) {
      Alert.alert('Error', 'Required information is missing');
      return;
    }
    
    try {
      setSaving(true);
      
      // Use staffService to update patient status (instead of patientService)
      await staffService.updatePatientStatus(
        patientId,
        status,
        user.id
      );
      
      // Update local state
      setPatient({
        ...patient,
        status: status
      });
      
      setStatusModalVisible(false);
      Alert.alert(
        'Status Updated', 
        `Patient status has been changed to ${status.charAt(0).toUpperCase() + status.slice(1)}.`
      );
    } catch (error) {
      console.error('Error updating patient status:', error);
      Alert.alert('Error', 'Failed to update patient status. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewMedicalRecords = (): void => {
    if (patient) {
      navigation.navigate('MedicalRecords', { patientId, patientName: patient.name });
    }
  };
  
  const handleScheduleAppointment = (): void => {
    if (patient) {
      navigation.navigate('ScheduleAppointment', { patientId, patientName: patient.name });
    }
  };

  const calculateAge = (dateOfBirth?: string): string => {
    if (!dateOfBirth) return '';
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading patient information...</Text>
      </View>
    );
  }

  if (error || !patient) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#dc3545" />
        <Text style={styles.errorText}>{error || 'Failed to load patient information'}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchPatientDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image 
            source={{ uri: patient.image || 'https://via.placeholder.com/150' }} 
            style={styles.patientImage} 
          />
          <View style={styles.patientMainInfo}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientDetails}>
              {calculateAge(patient.dateOfBirth)} years • {patient.gender || 'Not specified'}
            </Text>
            {patient.assignedDoctor && (
              <View style={styles.doctorAssigned}>
                <Ionicons name="medical-outline" size={14} color="#007bff" />
                <Text style={styles.doctorName}>{patient.assignedDoctor}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statusSection}>
          <TouchableOpacity 
            style={[
              styles.statusBadge, 
              patient.status === 'active' ? styles.activeStatus : styles.inactiveStatus
            ]}
            onPress={() => setStatusModalVisible(true)}
          >
            <View style={[
              styles.statusDot,
              patient.status === 'active' ? styles.activeStatusDot : styles.inactiveStatusDot
            ]} />
            <Text style={[
              styles.statusText,
              { color: patient.status === 'active' ? '#28a745' : '#dc3545' }
            ]}>
              {patient.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
            <Ionicons 
              name="chevron-down" 
              size={16} 
              color={patient.status === 'active' ? '#28a745' : '#dc3545'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.appointmentInfo}>
        {upcomingAppointment ? (
          <View style={styles.upcomingAppointment}>
            <Ionicons name="calendar" size={20} color="#007bff" />
            <Text style={styles.appointmentText}>
              Next appointment: {formatDate(upcomingAppointment.date)}
            </Text>
          </View>
        ) : (
          <View style={styles.noAppointment}>
            <Ionicons name="calendar-outline" size={20} color="#6c757d" />
            <Text style={styles.noAppointmentText}>
              No upcoming appointments
            </Text>
          </View>
        )}
        <Text style={styles.lastVisitText}>
          Last visit: {lastVisit ? formatDate(lastVisit.date) : 'No visits recorded'}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditField('phone', patient.phone || '')}
          >
            <Ionicons name="create-outline" size={18} color="#007bff" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="mail-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{patient.email || 'Not provided'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="call-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{patient.phone || 'Not provided'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="home-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{patient.address || 'Not provided'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>Emergency: {patient.emergencyContact || 'Not provided'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Insurance Details</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="shield-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>Provider: {patient.insuranceProvider || 'Not provided'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="card-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>Policy Number: {patient.insuranceNumber || 'Not provided'}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditField('notes', patient.notes || '')}
          >
            <Ionicons name="create-outline" size={18} color="#007bff" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="water-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>Blood Type: {patient.bloodType || 'Not specified'}</Text>
        </View>
        
        <View style={styles.medicalDetailsRow}>
          <Text style={styles.medicalTitle}>Allergies:</Text>
          {patient.allergies && patient.allergies.length > 0 ? (
            <View style={styles.tagsContainer}>
              {patient.allergies.map((allergy, index) => (
                <View key={index} style={styles.tagItem}>
                  <Text style={styles.tagText}>{allergy}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>None reported</Text>
          )}
        </View>
        
        <View style={styles.medicalDetailsRow}>
          <Text style={styles.medicalTitle}>Medical Conditions:</Text>
          {patient.medicalConditions && patient.medicalConditions.length > 0 ? (
            <View style={styles.tagsContainer}>
              {patient.medicalConditions.map((condition, index) => (
                <View key={index} style={styles.tagItem}>
                  <Text style={styles.tagText}>{condition}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>None reported</Text>
          )}
        </View>
        
        <View style={styles.medicalDetailsRow}>
          <Text style={styles.medicalTitle}>Medications:</Text>
          {patient.medications && patient.medications.length > 0 ? (
            <View style={styles.medicationsList}>
              {patient.medications.map((medication, index) => (
                <View key={index} style={styles.medicationItem}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.medicationDetails}>
                    {medication.dosage} • {medication.frequency}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>None reported</Text>
          )}
        </View>
        
        <View style={styles.notesContainer}>
          <Text style={styles.medicalTitle}>Notes:</Text>
          <Text style={styles.notesText}>{patient.notes || 'No notes added'}</Text>
        </View>
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleViewMedicalRecords}
        >
          <Ionicons name="document-text-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Medical Records</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.scheduleButton]}
          onPress={handleScheduleAppointment}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Schedule Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Field Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editField.charAt(0).toUpperCase() + editField.slice(1)}
            </Text>
            
            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, editField === 'notes' && styles.multilineInput]}
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
                multiline={editField === 'notes'}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.statusModalContent}>
            <Text style={styles.modalTitle}>Change Patient Status</Text>
            
            <TouchableOpacity 
              style={styles.statusOption}
              onPress={() => handleStatusChange('active')}
            >
              <View style={[styles.statusDot, styles.activeStatusDot]} />
              <Text style={styles.statusOptionText}>Active</Text>
              {patient.status === 'active' && (
                <Ionicons name="checkmark" size={20} color="#28a745" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statusOption}
              onPress={() => handleStatusChange('inactive')}
            >
              <View style={[styles.statusDot, styles.inactiveStatusDot]} />
              <Text style={styles.statusOptionText}>Inactive</Text>
              {patient.status === 'inactive' && (
                <Ionicons name="checkmark" size={20} color="#dc3545" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelStatusButton}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.cancelStatusText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  patientMainInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  patientDetails: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  doctorAssigned: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  doctorName: {
    fontSize: 14,
    color: '#007bff',
    marginLeft: 4,
  },
  statusSection: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeStatus: {
    backgroundColor: '#e6f7e6',
    borderColor: '#c3e6cb',
  },
  inactiveStatus: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeStatusDot: {
    backgroundColor: '#28a745',
  },
  inactiveStatusDot: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  appointmentInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  upcomingAppointment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f3ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  appointmentText: {
    fontSize: 14,
    color: '#007bff',
    marginLeft: 8,
    fontWeight: '600',
  },
  noAppointment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  noAppointmentText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
    fontWeight: '600',
  },
  lastVisitText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
  },
  medicalDetailsRow: {
    marginBottom: 16,
  },
  medicalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    backgroundColor: '#f0f9ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  tagText: {
    color: '#007bff',
    fontSize: 14,
  },
  medicationsList: {
    marginTop: 4,
  },
  medicationItem: {
    marginBottom: 10,
  },
  medicationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  medicationDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  scheduleButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  statusModalContent: {
    width: '75%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalInputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 20,
  },
  modalInput: {
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  cancelStatusButton: {
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 10,
  },
  cancelStatusText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default StaffPatientDetailsScreen;
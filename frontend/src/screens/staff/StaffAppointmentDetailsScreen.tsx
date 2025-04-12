import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { appointmentService } from '../../services/api';

// Define the type for route params
type StaffAppointmentDetailsRouteParams = {
  appointmentId: string;
  id?: string; // Adding this as an alternative parameter name
};

// Define the type for navigation
type StaffNavigationProps = {
  DoctorDetails: { doctorId: string; doctorName: string };
  PatientDetails: { patientId: string; patientName: string };
};

// Define the type for appointment data
interface AppointmentData {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  date: string;
  time: string;
  duration?: string;
  status: 'pending' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled';
  type?: string;
  department?: string;
  reason?: string;
  notes?: string;
  insurance?: string;
  createdAt: string;
  lastUpdated: string;
}

const StaffAppointmentDetailsScreen = () => {
  const route = useRoute<RouteProp<Record<string, StaffAppointmentDetailsRouteParams>, string>>();
  const navigation = useNavigation<NativeStackNavigationProp<StaffNavigationProps>>();
  // Use the id parameter if appointmentId is not available (for backward compatibility)
  const appointmentId = route.params.appointmentId || route.params.id || '';
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setError('No appointment ID provided');
      setLoading(false);
      return;
    }
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    if (!appointmentId) {
      setError('No appointment ID provided');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const appointmentData = await appointmentService.getAppointmentById(appointmentId);
      setAppointment(appointmentData);
    } catch (err) {
      console.error('Failed to fetch appointment details:', err);
      setError('Failed to load appointment details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToDoctorDetails = () => {
    if (!appointmentId) {
      Alert.alert('Error', 'No appointment ID provided');
      return;
    }
    
    if (!appointment) return;
    
    navigation.navigate('DoctorDetails', { 
      doctorId: appointment.doctorId, 
      doctorName: appointment.doctorName 
    });
  };

  const navigateToPatientDetails = () => {
    if (!appointmentId) {
      Alert.alert('Error', 'No appointment ID provided');
      return;
    }
    
    if (!appointment) return;
    
    navigation.navigate('PatientDetails', { 
      patientId: appointment.patientId, 
      patientName: appointment.patientName 
    });
  };

  const handleEditAppointment = () => {
    if (!appointmentId) {
      Alert.alert('Error', 'No appointment ID provided');
      return;
    }
    
    setEditModalVisible(true);
  };

  const handleStatusChange = async (status: AppointmentData['status']) => {
    if (!appointmentId) {
      Alert.alert('Error', 'No appointment ID provided');
      return;
    }

    try {
      await appointmentService.updateAppointment(appointmentId, { status });
      
      setAppointment(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      });
      
      setEditModalVisible(false);
      
      Alert.alert(
        'Status Updated',
        `Appointment status changed to ${status}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to update appointment status:', error);
      Alert.alert(
        'Update Failed',
        'Failed to update appointment status. Please try again.'
      );
    }
  };

  const handleCancelAppointment = () => {
    if (!appointmentId) {
      Alert.alert('Error', 'No appointment ID provided');
      return;
    }

    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentService.updateAppointment(appointmentId, { status: 'cancelled' });
              
              setAppointment(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  status: 'cancelled',
                  lastUpdated: new Date().toISOString().split('T')[0]
                };
              });
              
              Alert.alert('Appointment Cancelled', 'The appointment has been cancelled.');
            } catch (error) {
              console.error('Failed to cancel appointment:', error);
              Alert.alert(
                'Cancellation Failed',
                'Failed to cancel appointment. Please try again.'
              );
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: AppointmentData['status']) => {
    switch(status) {
      case 'confirmed': return '#28a745';
      case 'checked-in': return '#17a2b8';
      case 'pending': return '#ffc107';
      case 'completed': return '#6c757d';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: AppointmentData['status']) => {
    switch(status) {
      case 'confirmed': return 'checkmark-circle-outline';
      case 'checked-in': return 'log-in-outline';
      case 'pending': return 'time-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatDate = (dateString: string | undefined) => {
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
      </View>
    );
  }

  if (error || !appointment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#dc3545" />
        <Text style={styles.errorText}>{error || 'Appointment not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAppointmentDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointment Details</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditAppointment}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Ionicons name={getStatusIcon(appointment.status)} size={16} color="#fff" />
          <Text style={styles.statusText}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{formatDate(appointment.date)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Time:</Text>
          <Text style={styles.infoValue}>{appointment.time}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration:</Text>
          <Text style={styles.infoValue}>{appointment.duration || '30 minutes'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{appointment.type ? appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1) : 'Regular'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Department:</Text>
          <Text style={styles.infoValue}>{appointment.department || 'General'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reason:</Text>
          <Text style={styles.infoValue}>{appointment.reason || 'Not specified'}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.section}
        onPress={navigateToDoctorDetails}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Doctor Information</Text>
          <Ionicons name="chevron-forward" size={20} color="#007bff" />
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{appointment.doctorName}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Specialty:</Text>
          <Text style={styles.infoValue}>{appointment.doctorSpecialty || 'Not specified'}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.section}
        onPress={navigateToPatientDetails}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <Ionicons name="chevron-forward" size={20} color="#007bff" />
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{appointment.patientName}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{appointment.patientPhone || 'Not provided'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{appointment.patientEmail || 'Not provided'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Insurance:</Text>
          <Text style={styles.infoValue}>{appointment.insurance || 'Not provided'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Notes:</Text>
          <Text style={styles.infoValue}>{appointment.notes || 'No notes available'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>{formatDate(appointment.createdAt)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated:</Text>
          <Text style={styles.infoValue}>{formatDate(appointment.lastUpdated)}</Text>
        </View>
      </View>

      {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancelAppointment}
        >
          <Ionicons name="close-circle-outline" size={20} color="#fff" />
          <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
        </TouchableOpacity>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Appointment Status</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptions}>
              <TouchableOpacity 
                style={[styles.statusOption, { backgroundColor: '#f0f9ff' }]}
                onPress={() => handleStatusChange('pending')}
              >
                <Ionicons name="time-outline" size={24} color="#ffc107" />
                <Text style={styles.statusOptionText}>Pending</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statusOption, { backgroundColor: '#f0f9ff' }]}
                onPress={() => handleStatusChange('confirmed')}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#28a745" />
                <Text style={styles.statusOptionText}>Confirmed</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statusOption, { backgroundColor: '#f0f9ff' }]}
                onPress={() => handleStatusChange('checked-in')}
              >
                <Ionicons name="log-in-outline" size={24} color="#17a2b8" />
                <Text style={styles.statusOptionText}>Checked In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statusOption, { backgroundColor: '#f0f9ff' }]}
                onPress={() => handleStatusChange('completed')}
              >
                <Ionicons name="checkmark-done-outline" size={24} color="#6c757d" />
                <Text style={styles.statusOptionText}>Completed</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.statusOption, { backgroundColor: '#fff1f1' }]}
                onPress={() => handleStatusChange('cancelled')}
              >
                <Ionicons name="close-circle-outline" size={24} color="#dc3545" />
                <Text style={[styles.statusOptionText, {color: '#dc3545'}]}>Cancelled</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    width: 100,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    color: '#333',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 10,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  statusOptions: {
    marginVertical: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusOptionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  closeModalButton: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  closeModalButtonText: {
    fontSize: 16,
    color: '#333',
  },
});

export default StaffAppointmentDetailsScreen;
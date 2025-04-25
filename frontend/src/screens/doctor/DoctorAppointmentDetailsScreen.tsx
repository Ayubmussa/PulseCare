import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/api';
import api from '../../services/api';

interface RouteParams {
  id: string;
}

interface AppointmentDetails {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  duration: number;
  reason: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  patientDetails: {
    age: number;
    gender: string;
    phone: string;
    email: string;
  };
}

const DoctorAppointmentDetailsScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const { id: appointmentId } = route.params as RouteParams;

  useEffect(() => {
    loadAppointmentDetails();
  }, [appointmentId]);

  const loadAppointmentDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await appointmentService.getAppointmentById(appointmentId);
      
      // Transform the backend response to match the component's expected format
      const formattedAppointment = {
        id: response.id,
        patientId: response.patient_id,
        patientName: response.patients?.name || 'Patient',
        // Extract date and time from date_time field (format: "YYYY-MM-DDThh:mm")
        date: response.date_time ? response.date_time.split('T')[0] : '',
        time: response.date_time ? response.date_time.split('T')[1].substring(0, 5) : '00:00',
        duration: response.duration || 30, // Default to 30 minutes if not specified
        reason: response.reason || 'General consultation',
        notes: response.notes || '',
        status: response.status || 'scheduled',
        patientDetails: {
          age: response.patients?.age || 0,
          gender: response.patients?.gender || 'Not specified',
          phone: response.patients?.phone || 'Not provided',
          email: response.patients?.email || 'Not provided',
        }
      };
      
      setAppointment(formattedAppointment);
    } catch (error) {
      console.error('Failed to load appointment details:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Calculate end time
  const calculateEndTime = (timeString: string, durationMinutes: number) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    
    const ampm = endHours >= 12 ? 'PM' : 'AM';
    const hours12 = endHours % 12 || 12;
    const minutesStr = endMinutes.toString().padStart(2, '0');
    
    return `${hours12}:${minutesStr} ${ampm}`;
  };

  const handleCompleteAppointment = async () => {
    try {
      Alert.alert(
        'Complete Appointment',
        'Are you sure you want to mark this appointment as completed?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Complete', 
            style: 'default',
            onPress: async () => {
              setIsLoading(true);
              await appointmentService.updateAppointment(appointmentId, { status: 'completed' });
              loadAppointmentDetails();
              Alert.alert('Success', 'Appointment marked as completed');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to complete appointment:', error);
      Alert.alert('Error', 'Failed to update appointment status');
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    try {
      Alert.alert(
        'Cancel Appointment',
        'Are you sure you want to cancel this appointment?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                // Use the direct cancellation function instead
                const success = await directCancelAppointment();
                
                if (success) {
                  // Show success message
                  Alert.alert(
                    'Appointment Cancelled',
                    'The appointment has been successfully cancelled.'
                  );
                } else {
                  Alert.alert('Error', 'Failed to cancel the appointment. Please try again.');
                }
              } catch (error) {
                console.error('Failed to cancel appointment:', error);
                Alert.alert('Error', 'Failed to cancel the appointment. Please try again.');
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment');
      setIsLoading(false);
    }
  };

  // Direct cancellation function with explicit API call
  const directCancelAppointment = async () => {
    try {
      console.log(`Directly cancelling appointment ${appointmentId}`);
      
      // Use specialized cancelAppointment function for more reliability
      const response = await appointmentService.cancelAppointment(appointmentId);
      console.log('Cancellation API Response:', JSON.stringify(response, null, 2));
      
      // Update local appointment state
      if (appointment) {
        setAppointment({
          ...appointment,
          status: 'cancelled'
        });
      }
      
      // Reload appointment details to ensure everything is in sync
      await loadAppointmentDetails();
      
      return true;
    } catch (error) {
      console.error('Direct cancellation failed:', error);
      return false;
    }
  };

  const handleUpdateNotes = async () => {
    navigation.navigate('UpdateAppointmentNotes', { 
      appointmentId, 
      currentNotes: appointment?.notes || '',
      onReturn: loadAppointmentDetails
    });
  };

  const navigateToPatientDetails = () => {
    if (appointment) {
      navigation.navigate('PatientDetails', { 
        id: appointment.patientId,
        patientName: appointment.patientName
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
        <Text style={styles.errorText}>Appointment not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            { 
              backgroundColor: 
                appointment.status === 'scheduled' ? '#007bff' : 
                appointment.status === 'completed' ? '#28a745' : '#dc3545'
            }
          ]}
        >
          <Text style={styles.statusText}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>
      
      {/* Appointment Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appointment Details</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#007bff" />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(appointment.date)}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color="#007bff" />
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>
              {formatTime(appointment.time)} - {calculateEndTime(appointment.time, appointment.duration)}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="medkit-outline" size={20} color="#007bff" />
            <Text style={styles.infoLabel}>Reason for Visit</Text>
            <Text style={styles.infoValue}>{appointment.reason}</Text>
          </View>
        </View>
      </View>
      
      {/* Patient Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Patient Information</Text>
          <TouchableOpacity 
            style={styles.viewProfileButton}
            onPress={navigateToPatientDetails}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
            <Ionicons name="chevron-forward" size={16} color="#007bff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#6c757d" />
            <Text style={styles.infoLabel}>Patient Name</Text>
            <Text style={styles.infoValue}>{appointment.patientName}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={20} color="#6c757d" />
            <Text style={styles.infoLabel}>Age & Gender</Text>
            <Text style={styles.infoValue}>
              {appointment.patientDetails.age} years, {appointment.patientDetails.gender}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#6c757d" />
            <Text style={styles.infoLabel}>Contact</Text>
            <Text style={styles.infoValue}>{appointment.patientDetails.phone}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#6c757d" />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{appointment.patientDetails.email}</Text>
          </View>
        </View>
      </View>
      
      {/* Notes Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Doctor's Notes</Text>
          {appointment.status !== 'cancelled' && (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleUpdateNotes}
            >
              <Ionicons name="pencil" size={16} color="#007bff" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.notesText}>
          {appointment.notes.trim() ? appointment.notes : "No notes added yet."}
        </Text>
      </View>
      
      {/* Action Buttons */}
      {appointment.status === 'scheduled' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={async () => {
              Alert.alert(
                'Cancel Appointment',
                'Are you sure you want to cancel this appointment?',
                [
                  { text: 'No', style: 'cancel' },
                  { 
                    text: 'Yes', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        setIsLoading(true);
                        // Use the direct cancellation function instead
                        const success = await directCancelAppointment();
                        
                        if (success) {
                          // Show success message
                          Alert.alert(
                            'Appointment Cancelled',
                            'The appointment has been successfully cancelled.'
                          );
                        } else {
                          Alert.alert('Error', 'Failed to cancel the appointment. Please try again.');
                        }
                      } catch (error) {
                        console.error('Failed to cancel appointment:', error);
                        Alert.alert('Error', 'Failed to cancel the appointment. Please try again.');
                      } finally {
                        setIsLoading(false);
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="close-circle-outline" size={20} color="#dc3545" />
            <Text style={styles.secondaryButtonText}>Cancel Appointment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleCompleteAppointment}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Chat Button */}
      {appointment.status !== 'cancelled' && (
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => navigation.getParent()?.navigate('Chat', { 
            screen: 'ChatDetails',
            params: {
              patientId: appointment.patientId,
              patientName: appointment.patientName
            }
          })}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#ffffff" />
          <Text style={styles.chatButtonText}>Message Patient</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewProfileText: {
    fontSize: 14,
    color: '#007bff',
    marginRight: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#007bff',
    marginLeft: 6,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginTop: 2,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#212529',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dc3545',
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc3545',
    marginLeft: 6,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#007bff',
    borderRadius: 8,
    marginBottom: 30,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 8,
  },
});

export default DoctorAppointmentDetailsScreen;
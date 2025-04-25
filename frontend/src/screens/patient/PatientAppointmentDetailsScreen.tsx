import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, doctorService } from '../../services/api';

type RouteParams = {
  AppointmentDetails: {
    id: string;
  };
};

const PatientAppointmentDetailsScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [doctorDetails, setDoctorDetails] = useState<any>(null);
  
  const route = useRoute<RouteProp<RouteParams, 'AppointmentDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  
  // Get appointment ID from route params
  const appointmentId = route.params?.id;
  
  useEffect(() => {
    if (appointmentId) {
      loadAppointmentDetails();
    }
  }, [appointmentId]);
  
  useEffect(() => {
    if (appointment) {
      console.log('Rendering appointment details, ID:', appointmentId);
      console.log('Appointment status:', appointment.status);
    }
  }, [appointment, appointmentId]);
  
  const loadAppointmentDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch appointment details
      const appointmentData = await appointmentService.getAppointmentById(appointmentId);
      
      // Process appointment data to ensure it has all necessary fields
      const processedAppointment = {
        ...appointmentData,
        status: appointmentData.status || 'scheduled',
        appointment_type: appointmentData.appointment_type || 'in-person',
        location: appointmentData.location || 'PulseCare Clinic',
        notes: appointmentData.notes || ''
      };
      
      setAppointment(processedAppointment);
      
      // Fetch doctor details
      if (appointmentData.doctor_id) {
        const doctorData = await doctorService.getDoctorById(appointmentData.doctor_id);
        setDoctorDetails(doctorData);
      }
    } catch (error) {
      console.error('Failed to load appointment details:', error);
      Alert.alert('Error', 'Failed to load appointment details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = () => {
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
              console.log('Starting appointment cancellation for ID:', appointmentId);
              setIsLoading(true);
              
              // Get the original appointment state before updating
              const originalAppointmentState = { ...appointment };
              
              // Optimistically update the UI immediately for better user experience
              setAppointment({ ...appointment, status: 'cancelled' });
              
              // Try to send the update to the API using the specialized cancellation function
              try {
                // Make the cancellation request with the specialized function for better reliability
                console.log(`Using specialized cancelAppointment function for ID: ${appointmentId}`);
                const result = await appointmentService.cancelAppointment(appointmentId);
                
                console.log('Cancellation API response:', result);
                
                // Verify the cancellation was successful
                const verifyAppointment = await appointmentService.getAppointmentById(appointmentId);
                console.log('Verification status after cancellation:', verifyAppointment.status);
                
                if (verifyAppointment.status !== 'cancelled') {
                  console.warn('Appointment status not updated to cancelled in database. Retrying...');
                  // Try one more time with direct update as fallback
                  await appointmentService.updateAppointment(appointmentId, { status: 'cancelled' });
                }
                
                // Show success message
                Alert.alert(
                  'Success', 
                  'Appointment cancelled successfully',
                  [{ 
                    text: 'OK', 
                    onPress: () => {
                      // Navigate back to appointment list and refresh
                      navigation.navigate('Appointments', { 
                        screen: 'PatientAppointments',
                        params: { initialFilter: 'cancelled', refresh: true } 
                      });
                    } 
                  }]
                );
              } catch (apiError) {
                console.error('API Error during cancellation:', apiError);
                
                // Offer manual retry if the API fails
                Alert.alert(
                  'Connection Issue', 
                  'We had trouble connecting to the server. Would you like to try again?',
                  [
                    { 
                      text: 'Revert', 
                      onPress: () => {
                        // Revert to original state
                        setAppointment(originalAppointmentState);
                        setIsLoading(false);
                      }
                    },
                    {
                      text: 'Try Again',
                      onPress: () => handleCancelAppointment()
                    },
                    {
                      text: 'Stay Cancelled',
                      style: 'destructive',
                      onPress: () => {
                        // Keep the UI updated even if API failed
                        Alert.alert(
                          'Note', 
                          'The appointment has been marked as cancelled locally. Please check later to confirm the cancellation was processed.',
                          [{ 
                            text: 'OK', 
                            onPress: () => navigation.goBack()
                          }]
                        );
                      }
                    }
                  ]
                );
              }
            } catch (error) {
              console.error('Error in cancel appointment flow:', error);
              Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
              setIsLoading(false);
            } finally {
              if (!navigation.isFocused()) {
                // Only set loading to false if we haven't navigated away
                setIsLoading(false);
              }
            }
          }
        }
      ]
    );
  };
  
  const handleRescheduleAppointment = () => {
    navigation.navigate('BookAppointment', { 
      doctorId: appointment.doctor_id,
      rescheduleAppointmentId: appointmentId
    });
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };
  
  const isPastOrCancelled = () => {
    if (!appointment || !appointment.date_time) {
      return false;
    }
    
    // Add debugging to understand why the buttons might not be showing
    const appointmentDate = new Date(appointment.date_time);
    const currentDate = new Date();
    const isCompleted = appointment.status === 'completed';
    const isCancelled = appointment.status === 'cancelled';
    const isPast = appointmentDate < currentDate;
    
    console.log('Debug appointment status check:');
    console.log('- Appointment date:', appointmentDate);
    console.log('- Current date:', currentDate);
    console.log('- Is completed:', isCompleted);
    console.log('- Is cancelled:', isCancelled);
    console.log('- Is past date:', isPast);
    
    // Return false to always show the buttons for testing
    return isCompleted || isCancelled;
    // Don't include past date check for now to ensure buttons show up
    // return isCompleted || isCancelled || isPast;
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
        <Ionicons name="alert-circle-outline" size={60} color="#dc3545" />
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
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusBadge, 
              appointment.status === 'scheduled' ? styles.scheduledBadge :
              appointment.status === 'completed' ? styles.completedBadge :
              styles.cancelledBadge
            ]}
          >
            <Text style={styles.statusText}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Appointment Details</Text>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color="#6c757d" />
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {formatDate(appointment.date_time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color="#6c757d" />
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>
            {formatTime(appointment.date_time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="medkit-outline" size={20} color="#6c757d" />
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>
            {appointment.appointment_type === 'video' ? 'Video Consultation' : 'In-Person Visit'}
          </Text>
        </View>
        
        {appointment.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#6c757d" />
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{appointment.location}</Text>
          </View>
        )}
        
        {appointment.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}
      </View>
      
      {doctorDetails && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Doctor Information</Text>
          
          <View style={styles.doctorInfoContainer}>
            <View style={styles.doctorIconContainer}>
              <Ionicons name="person" size={30} color="#007bff" />
            </View>
            
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>{doctorDetails.name}</Text>
              <Text style={styles.doctorSpecialty}>{doctorDetails.specialty}</Text>
              
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => navigation.navigate('Doctors', { 
                  screen: 'ViewDoctor', 
                  params: { doctorId: doctorDetails.id }
                })}
              >
                <Text style={styles.viewProfileButtonText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {/* Action buttons section */}
      {!isPastOrCancelled() && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={() => {
              console.log('Reschedule button pressed');
              handleRescheduleAppointment();
            }}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Reschedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => {
              console.log('Cancel button pressed');
              handleCancelAppointment();
            }}
          >
            <Ionicons name="close-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 16,
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  scheduledBadge: {
    backgroundColor: '#28a745',
  },
  completedBadge: {
    backgroundColor: '#007bff',
  },
  cancelledBadge: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#495057',
    marginLeft: 8,
    width: 70,
  },
  detailValue: {
    fontSize: 16,
    color: '#212529',
    flex: 1,
    marginLeft: 8,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 4,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 22,
  },
  doctorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e7f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    color: '#212529',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 12,
  },
  viewProfileButton: {
    backgroundColor: '#e7f3ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  viewProfileButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 24,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  rescheduleButton: {
    backgroundColor: '#007bff',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PatientAppointmentDetailsScreen;
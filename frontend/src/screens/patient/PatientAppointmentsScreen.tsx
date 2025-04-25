import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/api';
import api from '../../services/api';

// Appointment type definition
interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'canceled' | 'confirmed' | 'checked-in' | 'no-show';
  notes?: string;
  location?: string;
}

const PatientAppointmentsScreen: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('upcoming');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { user } = useAuth();
  
  // Get initialFilter from route params if available
  const initialFilter = route.params?.initialFilter;

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    // Set the filter from route params if it exists
    if (initialFilter && ['upcoming', 'past', 'cancelled'].includes(initialFilter)) {
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    filterAppointments(activeFilter);
  }, [appointments, activeFilter]);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      if (user?.id) {
        // Using the appointmentService to get the patient's appointments
        const patientAppointmentsData = await appointmentService.getPatientAppointments(user.id);
        
        // Map the backend response to our frontend Appointment interface
        const formattedAppointments = patientAppointmentsData.map((apt: any) => {
          // Extract date and time from date_time field (format: "YYYY-MM-DDThh:mm")
          const dateTimeObj = new Date(apt.date_time);
          const date = dateTimeObj.toISOString().split('T')[0];
          const time = dateTimeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          return {
            id: apt.id,
            doctorId: apt.doctor_id,
            doctorName: apt.doctors?.name || 'Unknown Doctor',
            specialty: apt.doctors?.specialty || 'General',
            date: date,
            time: time,
            status: apt.status || 'scheduled',
            notes: apt.notes,
            location: apt.location || 'PulseCare Clinic'
          };
        });
        
        setAppointments(formattedAppointments);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAppointments();
  };

  const filterAppointments = (filterType: string) => {
    const now = new Date();
    
    console.log('Filtering appointments:', filterType);
    console.log('Total appointments:', appointments.length);
    console.log('Current date:', now.toISOString());
    
    // Debug: Log all appointments before filtering
    if (appointments.length > 0) {
      console.log('First appointment:', appointments[0]);
      
      // Debug: Log all appointment statuses and dates
      console.log('All appointment statuses:', 
        appointments.map(apt => `${apt.id}: ${apt.status} (${apt.date} ${apt.time})`).join(', '));
    }
    
    let filtered: Appointment[] = [];
    
    switch (filterType) {
      case 'upcoming':
        // Show appointments that are scheduled and have not passed yet
        filtered = appointments.filter(
          (apt) => {
            try {
              // Parse date more reliably
              const dateParts = apt.date.split('-');
              const timeParts = apt.time.replace(/\s*[AP]M\s*$/i, '').split(':');
              
              if (dateParts.length !== 3) {
                console.log('Invalid date format:', apt.date);
                return false;
              }
              
              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed in JavaScript
              const day = parseInt(dateParts[2]);
              
              // Create appointment date with at least hours and minutes
              const appointmentDate = new Date(year, month, day);
              if (timeParts.length >= 2) {
                let hours = parseInt(timeParts[0]);
                // Handle 12-hour format
                if (apt.time.toLowerCase().includes('pm') && hours < 12) {
                  hours += 12;
                } else if (apt.time.toLowerCase().includes('am') && hours === 12) {
                  hours = 0;
                }
                appointmentDate.setHours(hours);
                appointmentDate.setMinutes(parseInt(timeParts[1]));
              }
              
              // For debugging
              console.log(`Appointment: ${apt.doctorName}, Parsed Date: ${appointmentDate.toISOString()}, Status: ${apt.status}`);
              console.log(`Is upcoming: ${apt.status === 'scheduled' && appointmentDate > now}, Comparison: ${appointmentDate.getTime()} > ${now.getTime()}`);
              
              // Consider confirmed appointments as scheduled as well
              const isScheduledOrConfirmed = apt.status === 'scheduled' || apt.status === 'confirmed';
              const isUpcoming = appointmentDate > now;
              return isScheduledOrConfirmed && isUpcoming;
            } catch (error) {
              console.error('Error parsing date:', error, apt.date, apt.time);
              return false;
            }
          }
        );
        
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
        
      case 'past':
        // Show completed appointments OR scheduled appointments that have passed
        filtered = appointments.filter(
          (apt) => {
            try {
              // Parse date more reliably
              const dateParts = apt.date.split('-');
              const timeParts = apt.time.replace(/\s*[AP]M\s*$/i, '').split(':');
              
              if (dateParts.length !== 3) {
                console.log('Invalid date format:', apt.date);
                return false;
              }
              
              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed in JavaScript
              const day = parseInt(dateParts[2]);
              
              // Create appointment date
              const appointmentDate = new Date(year, month, day);
              if (timeParts.length >= 2) {
                let hours = parseInt(timeParts[0]);
                // Handle 12-hour format
                if (apt.time.toLowerCase().includes('pm') && hours < 12) {
                  hours += 12;
                } else if (apt.time.toLowerCase().includes('am') && hours === 12) {
                  hours = 0;
                }
                appointmentDate.setHours(hours);
                appointmentDate.setMinutes(parseInt(timeParts[1]));
              }
              
              // For debugging
              console.log(`Past check - Appointment: ${apt.doctorName}, Date: ${appointmentDate.toISOString()}, Status: ${apt.status}`);
              console.log(`Is past: ${apt.status === 'completed' || (apt.status === 'scheduled' && appointmentDate <= now)}`);
              
              // Add check for no-show and checked-in status
              const isCompleted = apt.status === 'completed' || apt.status === 'checked-in' || apt.status === 'no-show';
              const isScheduledButPassed = apt.status === 'scheduled' && appointmentDate <= now;
              
              // Make sure we don't include any kind of cancelled appointments
              const isCancelled = typeof apt.status === 'string' && apt.status.toLowerCase().includes('cancel');
              
              return (isCompleted || isScheduledButPassed) && !isCancelled;
            } catch (error) {
              console.error('Error parsing date:', error, apt.date, apt.time);
              return false;
            }
          }
        );
        
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
        
      case 'cancelled':
        // Show only cancelled appointments - check for both spellings and any spelling variations
        console.log('Looking for cancelled appointments...');
        
        filtered = appointments.filter(apt => {
          // Check status in a more flexible way - any value containing "cancel" in any case
          const isCancelled = typeof apt.status === 'string' && apt.status.toLowerCase().includes('cancel');
          console.log(`Appointment ${apt.id} status: "${apt.status}", isCancelled: ${isCancelled}`);
          return isCancelled;
        });
        
        console.log('Found cancelled appointments:', filtered.length);
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
        
      default:
        filtered = appointments;
    }
    
    console.log(`Filtered ${filterType} appointments:`, filtered.length);
    setFilteredAppointments(filtered);
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      console.log(`Directly cancelling appointment ${appointmentId}`);
      
      // Use the new specialized cancelAppointment function
      const response = await appointmentService.cancelAppointment(appointmentId);
      console.log('Cancellation API Response:', JSON.stringify(response, null, 2));
      
      // Update local state
      setAppointments(prevAppointments => 
        prevAppointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'cancelled' } 
            : apt
        )
      );
      
      // Force switch to cancelled tab
      setActiveFilter('cancelled');
      
      // Reload all appointments to ensure everything is in sync
      await loadAppointments();
      
      return true;
    } catch (error) {
      console.error('Direct cancellation failed:', error);
      Alert.alert(
        'Cancellation Error',
        'Failed to update appointment status in the database. Please try again.'
      );
      return false;
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
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
              console.log(`Attempting to cancel appointment ${appointmentId}`);
              
              // Update the appointment status in the database
              const response = await appointmentService.updateAppointment(appointmentId, { status: 'cancelled' });
              console.log('Cancellation response:', response);
              
              // Update the local state by modifying the appointment's status
              setAppointments(prevAppointments => 
                prevAppointments.map(apt => 
                  apt.id === appointmentId 
                    ? { ...apt, status: 'cancelled' } 
                    : apt
                )
              );
              
              // Force switch to cancelled tab after successful cancellation
              setActiveFilter('cancelled');
              
              // Refresh appointments to ensure UI is in sync with backend
              await loadAppointments();
              
              // Show success message
              Alert.alert('Success', 'Appointment cancelled successfully');
            } catch (error) {
              console.error('Failed to cancel appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment. Please try again later.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRescheduleAppointment = () => {
    if (!selectedAppointment) return;
    
    setModalVisible(false);
    navigation.navigate('RescheduleAppointment', { appointment: selectedAppointment });
  };

  const navigateToAppointmentDetails = (appointment: Appointment) => {
    navigation.navigate('AppointmentDetails', { id: appointment.id });
  };

  const navigateToBookAppointment = () => {
    // Navigate to the Doctors tab first, then to the BookAppointment screen
    navigation.navigate('Doctors', {
      screen: 'DoctorsList',
      // After showing the doctors list, user can select a doctor to book with
    });
  };

  const showAppointmentOptions = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#28a745'; // Green
      case 'completed':
        return '#007bff'; // Blue
      case 'cancelled':
        return '#dc3545'; // Red
      default:
        return '#6c757d'; // Gray
    }
  };

  // Render filter button
  const renderFilterButton = (title: string, filterName: string) => {
    const isActive = activeFilter === filterName;
    
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => setActiveFilter(filterName)}
      >
        <Text 
          style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render appointment item
  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const isPastOrCancelled = item.status === 'completed' || 
                             item.status === 'cancelled' || 
                             new Date(item.date) < new Date();
                             
    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigateToAppointmentDetails(item)}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentIconContainer}>
            <Ionicons name="calendar" size={24} color="#007bff" />
          </View>
          <View style={styles.appointmentInfo}>
            <Text style={styles.doctorName}>{item.doctorName}</Text>
            <Text style={styles.specialtyText}>{item.specialty}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => showAppointmentOptions(item)}
            disabled={isPastOrCancelled}
          >
            <Ionicons 
              name="ellipsis-vertical" 
              size={20} 
              color={isPastOrCancelled ? '#adb5bd' : '#212529'} 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.appointmentBody}>
          <View style={styles.appointmentDetail}>
            <Ionicons name="time-outline" size={16} color="#6c757d" />
            <Text style={styles.appointmentDetailText}>
              {formatDate(item.date)} • {item.time}
            </Text>
          </View>
          
          {item.location && (
            <View style={styles.appointmentDetail}>
              <Ionicons name="location-outline" size={16} color="#6c757d" />
              <Text style={styles.appointmentDetailText}>{item.location}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.appointmentFooter}>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(item.status) + '20' }
            ]}
          >
            <Text 
              style={[
                styles.statusText, 
                { color: getStatusColor(item.status) }
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    let message = 'No appointments found';
    let icon: keyof typeof Ionicons.glyphMap = 'calendar-outline';
    
    switch (activeFilter) {
      case 'upcoming':
        message = 'No upcoming appointments';
        break;
      case 'past':
        message = 'No past appointments';
        break;
      case 'cancelled':
        message = 'No cancelled appointments';
        icon = 'close-circle-outline';
        break;
    }
    
    return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name={icon} size={50} color="#adb5bd" />
        <Text style={styles.emptyStateText}>{message}</Text>
        {activeFilter === 'upcoming' && (
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={navigateToBookAppointment}
          >
            <Text style={styles.bookButtonText}>Book an Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Appointments</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={navigateToBookAppointment}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        {renderFilterButton('Upcoming', 'upcoming')}
        {renderFilterButton('Past', 'past')}
        {renderFilterButton('Cancelled', 'cancelled')}
      </View>
      
      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
          />
        }
      />
      
      {/* Appointment Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Appointment Options</Text>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleRescheduleAppointment}
              >
                <Ionicons name="calendar-outline" size={22} color="#007bff" />
                <Text style={styles.modalOptionText}>Reschedule</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={async () => {
                  console.log('Cancel button pressed, appointment ID:', selectedAppointment?.id);
                  if (selectedAppointment?.id) {
                    setModalVisible(false); // Close the modal first
                    
                    // Use the direct cancellation function instead
                    const success = await cancelAppointment(selectedAppointment.id);
                    
                    if (success) {
                      Alert.alert('Success', 'Appointment cancelled successfully');
                    } else {
                      Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
                    }
                  } else {
                    Alert.alert('Error', 'Cannot identify the appointment to cancel.');
                  }
                }}
              >
                <Ionicons name="close-circle-outline" size={22} color="#dc3545" />
                <Text style={[styles.modalOptionText, { color: '#dc3545' }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalOption, styles.modalCloseButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeFilterButton: {
    backgroundColor: '#e7f1ff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#e7f1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  specialtyText: {
    fontSize: 14,
    color: '#6c757d',
  },
  appointmentBody: {
    marginBottom: 12,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDetailText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
    marginBottom: 16,
  },
  bookButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalContent: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#212529',
  },
  modalCloseButton: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: 10,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default PatientAppointmentsScreen;
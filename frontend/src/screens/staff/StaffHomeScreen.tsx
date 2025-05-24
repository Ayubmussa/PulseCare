import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, staffService, patientService } from '../../services/api';

// Define types for the data structures
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
}

interface Doctor {
  id: string;
  name: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
}

interface PatientActivity {
  id: string;
  name: string;
  time: string;
  status: string;
}

// Type for valid Ionicons names
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const StaffHomeScreen = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [availableDoctors, setAvailableDoctors] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentPatients, setRecentPatients] = useState<PatientActivity[]>([]);

  // Set greeting based on time of day
  useEffect(() => {
    const hours = new Date().getHours();
    let greetingMessage = '';
    
    if (hours < 12) {
      greetingMessage = 'Good morning';
    } else if (hours >= 12 && hours < 17) {
      greetingMessage = 'Good afternoon';
    } else {
      greetingMessage = 'Good evening';
    }
    
    setGreeting(greetingMessage);
  }, []);

  // Fetch dashboard data from API
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0];
      
      // Use staff-specific endpoints for better authorization and separation of concerns
      const appointmentsResponse = await staffService.getStaffAppointments({
        date: todayFormatted
      });
      
      setTodayAppointments(appointmentsResponse.length);
      
      // Filter pending appointments
      const pending = appointmentsResponse.filter((apt: Appointment) => apt.status === 'pending');
      setPendingAppointments(pending.length);
        // Fetch upcoming appointments for display
      const upcomingResponse = await staffService.getStaffAppointments();
      
      // Transform appointments data to include separate date/time fields
      const transformedAppointments = upcomingResponse.map((apt: any) => {
        // Extract date and time from date_time (format: "YYYY-MM-DDThh:mm")
        const dateTime = new Date(apt.date_time);
        const formattedDate = dateTime.toISOString().split('T')[0];
        const formattedTime = dateTime.toTimeString().substring(0, 5);
        
        return {
          ...apt,
          // Add backwards compatibility fields
          patientId: apt.patient_id,
          patientName: apt.patients?.name || 'Unknown Patient',
          doctorId: apt.doctor_id,
          doctorName: apt.doctors?.name || 'Unknown Doctor',
          date: formattedDate,
          time: formattedTime,
        };
      });
      
      const upcoming = transformedAppointments
        .filter((apt: Appointment) => apt.status === 'scheduled' || apt.status === 'confirmed' || apt.status === 'checked-in')
        .sort((a: Appointment, b: Appointment) => {
          return new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime();
        })
        .slice(0, 3); // Get the first 3
      setUpcomingAppointments(upcoming);
      
      // Fetch doctors using staff-specific endpoint
      const doctorsResponse = await staffService.getAllDoctors();
      // In a real app, you would filter doctors who are available today
      // For now, we'll just count all active doctors
      const availableDocs = doctorsResponse.filter((doc: Doctor) => doc.status === 'active');
      setAvailableDoctors(availableDocs.length);
      
      // Fetch total patients count
      const patientsResponse = await patientService.getAllPatients();
      setTotalPatients(patientsResponse.length);
        // Get recent patient activities
      // This would typically come from a dedicated API endpoint
      // For now, we'll derive it from recent appointments
      const recentActivities = transformedAppointments
        .slice(0, 3)
        .map((apt: Appointment) => ({
          id: apt.patientId,
          name: apt.patientName,
          time: apt.time,
          status: apt.status === 'checked-in' ? 'checked-in' : 
                  apt.status === 'scheduled' ? 'registered' : 'waiting'
        }));
      setRecentPatients(recentActivities);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard information. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToAppointments = () => {
    navigation.navigate('ManageAppointments');
  };

  const navigateToDoctors = () => {
    navigation.navigate('ManageDoctors');
  };

  const navigateToAppointmentDetails = (appointmentId: string) => {
    // Updated to support both parameter naming conventions
    navigation.navigate('AppointmentDetails', { appointmentId, id: appointmentId });
  };

  const navigateToPatientDetails = (patientId: string, patientName: string) => {
    navigation.navigate('Patients', { 
      screen: 'PatientDetails', 
      params: { patientId, patientName } 
    });
  };

  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'confirmed': return '#28a745';
      case 'checked-in': return '#17a2b8';
      case 'waiting': return '#ffc107';
      case 'registered': return '#007bff';
      case 'pending': return '#ffc107';
      case 'completed': return '#6c757d';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string): IoniconsName => {
    switch(status) {
      case 'confirmed': return 'checkmark-circle-outline';
      case 'checked-in': return 'log-in-outline';
      case 'waiting': return 'time-outline';
      case 'registered': return 'person-add-outline';
      case 'pending': return 'time-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  // Format time for display (e.g., convert "14:30:00" to "2:30 PM")
  const formatTime = (timeString: string): string => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with greeting and profile */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.staffName}>{user?.name || 'Staff Member'}</Text>
          <Text style={styles.staffRole}>{user?.role || 'Clinic Staff'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileImageContainer}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image
            source={{ uri: user?.image || 'https://via.placeholder.com/60' }}
            style={styles.profileImage}
            onError={(e) => console.log('Image not found, using placeholder')}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <TouchableOpacity
            key="stats-today-appointments"
            style={styles.statsCard}
            onPress={navigateToAppointments}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="calendar" size={24} color="#007bff" />
            </View>
            <Text style={styles.statsNumber}>{todayAppointments}</Text>
            <Text style={styles.statsLabel}>Today's Appointments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            key="stats-pending-appointments"
            style={styles.statsCard}
            onPress={navigateToAppointments}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#fff7e0' }]}>
              <Ionicons name="time" size={24} color="#ffc107" />
            </View>
            <Text style={styles.statsNumber}>{pendingAppointments}</Text>
            <Text style={styles.statsLabel}>Pending Appointments</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity
            key="stats-available-doctors"
            style={styles.statsCard}
            onPress={navigateToDoctors}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#e0f8e6' }]}>
              <Ionicons name="medical" size={24} color="#28a745" />
            </View>
            <Text style={styles.statsNumber}>{availableDoctors}</Text>
            <Text style={styles.statsLabel}>Available Doctors</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            key="stats-total-patients"
            style={styles.statsCard}
            onPress={() => navigation.navigate('ManagePatients')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#f0e7ff' }]}>
              <Ionicons name="people" size={24} color="#6f42c1" />
            </View>
            <Text style={styles.statsNumber}>{totalPatients}</Text>
            <Text style={styles.statsLabel}>Total Patients</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            key="action-appointments"
            style={styles.actionButton}
            onPress={() => navigation.navigate('ManageAppointments')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="calendar" size={20} color="#007bff" />
            </View>
            <Text style={styles.actionText}>Appointments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            key="action-doctors"
            style={styles.actionButton}
            onPress={() => navigation.navigate('ManageDoctors')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#e0f8e6' }]}>
              <Ionicons name="medical" size={20} color="#28a745" />
            </View>
            <Text style={styles.actionText}>Doctors</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            key="action-patients"
            style={styles.actionButton}
            onPress={() => navigation.navigate('ManagePatients')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#f0e7ff' }]}>
              <Ionicons name="people" size={20} color="#6f42c1" />
            </View>
            <Text style={styles.actionText}>Patients</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Upcoming Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={navigateToAppointments}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map(appointment => (
            <TouchableOpacity
              key={appointment.id}
              style={styles.appointmentItem}
              onPress={() => navigateToAppointmentDetails(appointment.id)}
            >
              <View style={styles.appointmentTimeContainer}>
                <Text style={styles.appointmentTime}>{formatTime(appointment.time)}</Text>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: getStatusColor(appointment.status) }
                ]} />
              </View>
              
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentName}>{appointment.patientName}</Text>
                <Text style={styles.appointmentDoctor}>{appointment.doctorName}</Text>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
          </View>
        )}
      </View>

      {/* Recent Patient Check-ins */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Patient Activities</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ManagePatients')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        {recentPatients.length > 0 ? (
          recentPatients.map(patient => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientItem}
              onPress={() => navigateToPatientDetails(patient.id, patient.name)}
            >
              <View style={styles.patientIconContainer}>
                <Ionicons 
                  name={getStatusIcon(patient.status)} 
                  size={18} 
                  color={getStatusColor(patient.status)} 
                />
              </View>
              
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientStatus}>
                  {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)} at {formatTime(patient.time)}
                </Text>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No recent patient activities</Text>
          </View>
        )}
      </View>

      {/* Bottom space */}
      <View style={styles.bottomSpace} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  staffName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  staffRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  profileImage: {
    width: 50,
    height: 50,
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  actionButton: {
    alignItems: 'center',
    width: 80,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007bff',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  appointmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  appointmentDoctor: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patientIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  patientStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bottomSpace: {
    height: 20,
  }
});

export default StaffHomeScreen;
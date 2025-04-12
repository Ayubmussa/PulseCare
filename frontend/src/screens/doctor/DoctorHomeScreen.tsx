import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, patientService, doctorService } from '../../services/api';

// Quick access service type
interface QuickAccessService {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

// Patient type
interface Patient {
  id: string;
  name: string;
  age: number;
  condition?: string;
  image?: string;
}

// Appointment type
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

const DoctorHomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [todaysAppointments, setTodaysAppointments] = useState<Appointment[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [appointmentsSummary, setAppointmentsSummary] = useState({
    today: 0,
    upcoming: 0,
    completed: 0,
  });
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  // Quick access services
  const quickAccessServices: QuickAccessService[] = [
    { id: '1', name: 'Schedule', icon: 'calendar', route: 'Schedule' },
    { id: '2', name: 'Patients', icon: 'people', route: 'PatientList' },
    { id: '3', name: 'Appointments', icon: 'time', route: 'DoctorAppointments' },
    { id: '4', name: 'Chat', icon: 'chatbubbles', route: 'DoctorChat' },
  ];

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Load doctor data
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch doctor's appointments for today
      if (user?.id) {
        const today = new Date().toISOString().split('T')[0];
        
        const appointmentsData = await doctorService.getDoctorAppointments(user.id);
        
        // Filter for today's appointments
        const todaysAppts = appointmentsData
          .filter((app: any) => app.date === today)
          .sort((a: any, b: any) => a.time.localeCompare(b.time));
          
        setTodaysAppointments(todaysAppts);
        
        // Get appointments summary
        const upcoming = appointmentsData.filter((app: any) => 
          app.status === 'scheduled' && 
          (app.date > today || (app.date === today && isTimeAfterNow(app.time)))
        ).length;
        
        const completed = appointmentsData.filter((app: any) => 
          app.status === 'completed'
        ).length;
        
        setAppointmentsSummary({
          today: todaysAppts.length,
          upcoming,
          completed,
        });
        
        // Fetch recent patients
        const recentPatientIds = Array.from(new Set(
          appointmentsData
            .filter((app: any) => new Date(app.date) <= new Date())
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((app: any) => app.patientId)
        )).slice(0, 5);
        
        const patientsData = await Promise.all(
          recentPatientIds.map((id) => patientService.getPatientById(id as string))
        );
        
        setRecentPatients(patientsData);
      }
    } catch (error) {
      console.error('Failed to load doctor data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Check if time is after current time
  const isTimeAfterNow = (timeString: string) => {
    const now = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    return now.getHours() < hours || (now.getHours() === hours && now.getMinutes() < minutes);
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Navigate to appointment details
  const navigateToAppointmentDetails = (appointmentId: string) => {
    navigation.navigate('AppointmentDetails', { id: appointmentId });
  };

  // Navigate to patient details
  const navigateToPatientDetails = (patientId: string, patientName: string) => {
    navigation.navigate('PatientDetails', { id: patientId, patientName });
  };

  // Navigate to quick access service
  const navigateToService = (route: string) => {
    navigation.navigate(route);
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#007bff']}
        />
      }
    >
      {/* Header with greeting and profile */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, Dr.</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image 
            source={{ uri: user?.image || 'https://via.placeholder.com/40' }} 
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {/* Appointments Summary Cards */}
      <View style={styles.summaryCardsContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#e7f1ff' }]}>
          <Text style={styles.summaryCardValue}>{appointmentsSummary.today}</Text>
          <Text style={styles.summaryCardLabel}>Today</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fff0e6' }]}>
          <Text style={styles.summaryCardValue}>{appointmentsSummary.upcoming}</Text>
          <Text style={styles.summaryCardLabel}>Upcoming</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#ecfbf5' }]}>
          <Text style={styles.summaryCardValue}>{appointmentsSummary.completed}</Text>
          <Text style={styles.summaryCardLabel}>Completed</Text>
        </View>
      </View>

      {/* Quick Access Services */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickAccessContainer}>
          {quickAccessServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.quickAccessItem}
              onPress={() => navigateToService(service.route)}
            >
              <View style={styles.quickAccessIconContainer}>
                <Ionicons name={service.icon} size={24} color="#007bff" />
              </View>
              <Text style={styles.quickAccessText}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Today's Appointments */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DoctorAppointments')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {todaysAppointments.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={50} color="#adb5bd" />
            <Text style={styles.emptyStateText}>No appointments scheduled for today</Text>
          </View>
        ) : (
          <View>
            {todaysAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => navigateToAppointmentDetails(appointment.id)}
              >
                <View style={styles.appointmentIconContainer}>
                  <Text style={styles.appointmentTimeIcon}>{formatTime(appointment.time)}</Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientName}>{appointment.patientName}</Text>
                  <Text style={styles.appointmentReason}>{appointment.reason}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#adb5bd" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Recent Patients */}
      <View style={[styles.sectionContainer, styles.lastSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Patients</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PatientList')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={recentPatients}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.patientsListContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientCard}
              onPress={() => navigateToPatientDetails(item.id, item.name)}
            >
              <Image
                source={{ uri: item.image || 'https://via.placeholder.com/100' }}
                style={styles.patientImage}
              />
              <Text style={styles.patientCardName}>{item.name}</Text>
              <Text style={styles.patientCardDetails}>{item.age} years</Text>
              {item.condition && (
                <View style={styles.conditionContainer}>
                  <Ionicons name="medical" size={12} color="#dc3545" />
                  <Text style={styles.conditionText}>{item.condition}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyPatientsContainer}>
              <Text style={styles.emptyStateText}>No recent patients</Text>
            </View>
          }
        />
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  greeting: {
    fontSize: 14,
    color: '#6c757d',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  summaryCard: {
    width: '30%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 6,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  lastSection: {
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007bff',
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickAccessItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickAccessIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 15,
    backgroundColor: '#e7f1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessText: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 10,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  appointmentIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#e7f1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appointmentTimeIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
    textAlign: 'center',
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 14,
    color: '#6c757d',
  },
  patientsListContainer: {
    paddingRight: 20,
  },
  patientCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  patientImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
    alignSelf: 'center',
  },
  patientCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  patientCardDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 6,
  },
  conditionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionText: {
    fontSize: 12,
    color: '#dc3545',
    marginLeft: 4,
  },
  emptyPatientsContainer: {
    width: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
});

export default DoctorHomeScreen;
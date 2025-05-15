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
import { appointmentService, doctorService } from '../../services/api';

// Quick access service type
interface QuickAccessService {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

// Doctor type
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  image?: string;
}

// Appointment type
interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

const PatientHomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recommendedDoctors, setRecommendedDoctors] = useState<Doctor[]>([]);
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout } = useAuth();

  // Quick access services
  const quickAccessServices: QuickAccessService[] = [
    { id: '1', name: 'Appointments', icon: 'calendar', route: 'Appointments' },
    { id: '2', name: 'Doctors', icon: 'medkit', route: 'Doctors' },
    { id: '3', name: 'Medical Records', icon: 'document-text', route: 'MedicalRecords' },
    { id: '4', name: 'Chat', icon: 'chatbubbles', route: 'Chat' },
  ];

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Load patient data
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch upcoming appointments for the patient
      if (user?.id) {
        // Using getAllAppointments instead of getPatientAppointments
        const appointmentsData = await appointmentService.getAllAppointments();
        
        // Filter appointments for the current user
        const userAppointments = appointmentsData.filter((app: any) => app.patientId === user.id);
        
        // Filter for upcoming appointments only and sort by date
        const upcoming = userAppointments
          .filter((app: any) => app.status === 'scheduled' && new Date(app.date) >= new Date())
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3); // Get the next 3 appointments
          
        setUpcomingAppointments(upcoming);
        
        // Fetch recommended doctors
        const doctorsData = await doctorService.getAllDoctors();
        // In a real app, we would use an algorithm to determine recommended doctors
        // For now, just get the first 5 doctors
        setRecommendedDoctors(doctorsData.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Navigate to appointment details
  const navigateToAppointmentDetails = (appointmentId: string) => {
    navigation.navigate('Appointments', {
      screen: 'AppointmentDetails',
      params: { id: appointmentId }
    });
  };

  // Navigate to doctor details
  const navigateToDoctorDetails = (doctorId: string) => {
    navigation.navigate('Doctors', {
      screen: 'ViewDoctor',
      params: { doctorId }
    });
  };

  // Navigate to quick access service
  const navigateToService = (route: string) => {
    // Map route names to proper navigation paths
    switch (route) {
      case 'Appointments':
        navigation.navigate('Appointments');
        break;
      case 'Doctors':
        navigation.navigate('Doctors');
        break;
      case 'MedicalRecords':
        navigation.navigate('Records');
        break;
      case 'Chat':
        navigation.navigate('Chat');
        break;
      default:
        navigation.navigate(route);
    }
  };

  // Navigate to book appointment
  const navigateToBookAppointment = () => {
    // Navigate to the Doctors tab first to allow doctor selection
    navigation.navigate('Doctors', { 
      screen: 'DoctorsList'
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
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
          <Text style={styles.greeting}>Hello,</Text>
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

      {/* Upcoming Appointments */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {upcomingAppointments.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={50} color="#adb5bd" />
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={navigateToBookAppointment}
            >
              <Text style={styles.bookButtonText}>Book an Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {upcomingAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => navigateToAppointmentDetails(appointment.id)}
              >
                <View style={styles.appointmentIconContainer}>
                  <Ionicons name="calendar" size={24} color="#007bff" />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                  <Text style={styles.specialtyText}>{appointment.specialty}</Text>
                  <View style={styles.appointmentTimeContainer}>
                    <Ionicons name="time-outline" size={14} color="#6c757d" />
                    <Text style={styles.appointmentTime}>
                      {formatDate(appointment.date)} • {appointment.time}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#adb5bd" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Recommended Doctors */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended Doctors</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Doctors')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={recommendedDoctors}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.doctorsListContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.doctorCard}
              onPress={() => navigateToDoctorDetails(item.id)}
            >
              <Image
                source={{ uri: item.image || 'https://via.placeholder.com/100' }}
                style={styles.doctorImage}
              />
              <Text style={styles.doctorCardName}>{item.name}</Text>
              <Text style={styles.doctorCardSpecialty}>{item.specialty}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#ffc107" />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyDoctorsContainer}>
              <Text style={styles.emptyStateText}>No recommended doctors</Text>
            </View>
          }
        />
      </View>

      {/* Health Tips Section */}
      <View style={[styles.sectionContainer, styles.lastSection]}>
        <Text style={styles.sectionTitle}>Health Tips</Text>
        <View style={styles.healthTipCard}>
          <View style={styles.healthTipContent}>
            <Text style={styles.healthTipTitle}>Stay Hydrated</Text>
            <Text style={styles.healthTipText}>
              Drink at least 8 glasses of water daily for optimal health.
            </Text>
            <TouchableOpacity style={styles.readMoreButton}>
              <Text style={styles.readMoreText}>Read More</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.healthTipImageContainer}>
            <Ionicons name="water-outline" size={50} color="#007bff" />
          </View>
        </View>
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
    marginBottom: 16,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
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
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#e7f1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    marginBottom: 6,
  },
  appointmentTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  doctorsListContainer: {
    paddingRight: 20,
  },
  doctorCard: {
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
  doctorImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
    alignSelf: 'center',
  },
  doctorCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  doctorCardSpecialty: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  emptyDoctorsContainer: {
    width: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  healthTipCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  healthTipContent: {
    flex: 3,
  },
  healthTipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  healthTipText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  healthTipImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PatientHomeScreen;
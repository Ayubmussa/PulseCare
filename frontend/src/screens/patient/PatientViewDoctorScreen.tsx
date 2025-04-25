import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { doctorService } from '../../services/api';

// Define interfaces for type safety
interface DoctorAvailabilitySlot {
  day: string;
  slots: string[];
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image?: string;
  rating?: number;
  reviews?: number;
  hospital?: string;
  about?: string;
  experience?: string;
  education?: string;
  languages?: string[];
  address?: string;
  availability?: DoctorAvailabilitySlot[];
}

// Define route param types
type PatientStackParamList = {
  ViewDoctor: { doctorId: string };
  BookAppointment: { doctorId: string };
  ChatDetails: { doctorId: string; doctorName: string };
};

type PatientViewDoctorRouteProp = RouteProp<PatientStackParamList, 'ViewDoctor'>;
type PatientStackNavigationProp = StackNavigationProp<PatientStackParamList>;

const PatientViewDoctorScreen = () => {
  const route = useRoute<PatientViewDoctorRouteProp>();
  const navigation = useNavigation<PatientStackNavigationProp>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch doctor details from API
  useEffect(() => {
    const fetchDoctorDetails = async () => {
      try {
        setLoading(true);
        const doctorId = route.params?.doctorId;
        
        if (!doctorId) {
          setError('Doctor ID is missing');
          setLoading(false);
          return;
        }
        
        const doctorData = await doctorService.getDoctorById(doctorId);
        setDoctor(doctorData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching doctor details:', err);
        setError('Failed to load doctor information. Please try again later.');
        setLoading(false);
      }
    };

    fetchDoctorDetails();
  }, [route.params?.doctorId]);

  const navigateToBookAppointment = () => {
    if (doctor) {
      // Handle different navigation paths based on where we came from
      const currentRoute = navigation.getState().routes[navigation.getState().index];
      const parentScreen = currentRoute?.name;
      
      if (parentScreen === 'ViewDoctor' && navigation.canGoBack()) {
        // If we're in the Doctors stack
        navigation.navigate('BookAppointment', { doctorId: doctor.id });
      } else {
        // Coming from Home or another tab - use nested navigation
        navigation.navigate('BookAppointment', { doctorId: doctor.id });
      }
    }
  };

  const handleStartChat = () => {
    if (doctor) {
      // Using a more general navigation approach that works with nested navigators
      navigation.getParent()?.navigate('Chat', {
        screen: 'ChatDetails',
        params: { 
          doctorId: doctor.id,
          doctorName: doctor.name
        }
      });
    }
  };

  const renderAvailability = () => {
    if (!doctor || !doctor.availability || !Array.isArray(doctor.availability)) {
      return <Text style={styles.noDataText}>No availability information</Text>;
    }
    
    return doctor.availability.map((day: DoctorAvailabilitySlot, index: number) => (
      <View key={index} style={styles.availabilityDay}>
        <Text style={styles.dayName}>{day.day}</Text>
        <View style={styles.slotsContainer}>
          {day.slots && Array.isArray(day.slots) ? day.slots.map((slot: string, slotIndex: number) => (
            <View key={slotIndex} style={styles.slot}>
              <Text style={styles.slotText}>{slot}</Text>
            </View>
          )) : (
            <Text style={styles.noDataText}>No time slots available</Text>
          )}
        </View>
      </View>
    ));
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading doctor's profile...</Text>
      </View>
    );
  }

  // Show error state
  if (error || !doctor) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#ff4040" />
        <Text style={styles.errorText}>{error || 'Doctor information not available'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Doctor Header */}
      <View style={styles.header}>
        <Image 
          source={{ uri: doctor.image || 'https://via.placeholder.com/150' }} 
          style={styles.doctorImage} 
        />
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{doctor.rating}</Text>
            <Text style={styles.reviewsText}>({doctor.reviews || 0} reviews)</Text>
          </View>
          <Text style={styles.hospitalText}>{doctor.hospital || 'PulseCare Medical Center'}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.appointmentButton} onPress={navigateToBookAppointment}>
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Book Appointment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatButton} onPress={handleStartChat}>
          <Ionicons name="chatbubble-outline" size={20} color="#007bff" />
          <Text style={styles.chatButtonText}>Send Message</Text>
        </TouchableOpacity>
      </View>

      {/* Doctor Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>{doctor.about || 'No information available.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience & Education</Text>
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={20} color="#007bff" />
          <Text style={styles.infoText}>Experience: {doctor.experience || 'Not specified'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="school-outline" size={20} color="#007bff" />
          <Text style={styles.infoText}>Education: {doctor.education || 'Not specified'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="language-outline" size={20} color="#007bff" />
          <Text style={styles.infoText}>
            Languages: {doctor.languages ? doctor.languages.join(', ') : 'Not specified'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color="#007bff" />
          <Text style={styles.infoText}>{doctor.address || 'Address not available'}</Text>
        </View>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>Map will be displayed here</Text>
        </View>
      </View>

      {doctor.availability && doctor.availability.length > 0 ? (
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Availability</Text>
          {renderAvailability()}
        </View>
      ) : (
        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={styles.noDataText}>No availability information</Text>
        </View>
      )}
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
    marginTop: 10,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007bff',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  doctorImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  doctorInfo: {
    marginLeft: 15,
    justifyContent: 'center',
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    color: '#333',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  reviewsText: {
    color: '#777',
    marginLeft: 4,
    fontSize: 12,
  },
  hospitalText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  appointmentButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  chatButtonText: {
    color: '#007bff',
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  lastSection: {
    marginBottom: 20,
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#555',
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  mapText: {
    color: '#777',
  },
  availabilityDay: {
    marginBottom: 15,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slot: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 8,
  },
  slotText: {
    fontSize: 12,
    color: '#555',
  },
  noDataText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  },
});

export default PatientViewDoctorScreen;
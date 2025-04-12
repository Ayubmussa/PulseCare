import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, doctorService } from '../../services/api';

// Define interfaces for our data structures
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital?: string;
  fee?: number;
}

interface Day {
  id: string;
  date: Date;
  day: string;
  dayNum: number;
  month: string;
  available: boolean;
}

interface TimeSlot {
  id: string;
  time: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface TimeSlots {
  morningSlots: TimeSlot[];
  afternoonSlots: TimeSlot[];
}

// Define the route params
interface RouteParams {
  doctorId: string;
}

const PatientBookAppointmentScreen = () => {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  // Check if route.params exists before destructuring
  const doctorId = route.params?.doctorId;
  
  const [isLoading, setIsLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlots>({ morningSlots: [], afternoonSlots: [] });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState('in-person');
  
  // Fetch doctor details from API
  useEffect(() => {
    fetchDoctorDetails();
  }, [doctorId]);
  
  // Generate calendar days when doctor is loaded
  useEffect(() => {
    if (doctor) {
      generateDays();
    }
  }, [doctor]);
  
  // Fetch available time slots when a day is selected
  useEffect(() => {
    if (selectedDay) {
      fetchAvailableTimeSlots(selectedDay.date);
    }
  }, [selectedDay]);

  const fetchDoctorDetails = async () => {
    if (!doctorId) return;
    
    try {
      setIsLoading(true);
      const doctorData = await doctorService.getDoctorById(doctorId);
      setDoctor(doctorData);
    } catch (error) {
      console.error('Failed to load doctor details:', error);
      Alert.alert('Error', 'Failed to load doctor information. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateDays = () => {
    const today = new Date();
    const daysArray: Day[] = [];
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      daysArray.push({
        id: i.toString(),
        date: date,
        day: date.toLocaleString('default', { weekday: 'short' }),
        dayNum: date.getDate(),
        month: date.toLocaleString('default', { month: 'short' }),
        available: true, // Default to available, will check with API
      });
    }
    
    setDays(daysArray);
    setSelectedDay(daysArray[0]);
  };
  
  const fetchAvailableTimeSlots = async (date: Date) => {
    try {
      setIsLoading(true);
      
      // Format the date for API call
      const formattedDate = formatDateForAPI(date);
      
      // Mock API call for time slots until real endpoint is available
      // In a real implementation, you would call the doctor service API
      // const availabilityData = await doctorService.getDoctorAvailabilityForDate(doctorId, formattedDate);
      
      // Mock response data for development
      const mockResponse = {
        slots: [
          { id: '1', startTime: '08:00', endTime: '09:00', isBooked: false },
          { id: '2', startTime: '09:00', endTime: '10:00', isBooked: true },
          { id: '3', startTime: '10:00', endTime: '11:00', isBooked: false },
          { id: '4', startTime: '11:00', endTime: '12:00', isBooked: false },
          { id: '5', startTime: '13:00', endTime: '14:00', isBooked: false },
          { id: '6', startTime: '14:00', endTime: '15:00', isBooked: true },
          { id: '7', startTime: '15:00', endTime: '16:00', isBooked: false },
          { id: '8', startTime: '16:00', endTime: '17:00', isBooked: false },
        ]
      };
      
      const availabilityData = mockResponse;
      
      // Separate into morning and afternoon slots
      const morningSlots: TimeSlot[] = [];
      const afternoonSlots: TimeSlot[] = [];
      
      availabilityData.slots.forEach((slot: any) => {
        const time = new Date(`${formattedDate}T${slot.startTime}`);
        const hours = time.getHours();
        
        // Convert to 12-hour format
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        const minutes = time.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours12}:${minutes} ${ampm}`;
        
        const slotObject: TimeSlot = {
          id: slot.id,
          time: timeString,
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: !slot.isBooked
        };
        
        // Split into morning/afternoon based on hour
        if (hours < 12) {
          morningSlots.push(slotObject);
        } else {
          afternoonSlots.push(slotObject);
        }
      });
      
      setTimeSlots({
        morningSlots,
        afternoonSlots
      });
      
      setSelectedTimeSlot(null);
    } catch (error) {
      console.error('Failed to load time slots:', error);
      Alert.alert('Error', 'Failed to load available time slots. Please try again later.');
      
      // Fallback to empty slots in case of error
      setTimeSlots({ morningSlots: [], afternoonSlots: [] });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDaySelection = (day: Day) => {
    setSelectedDay(day);
  };
  
  const handleTimeSelection = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedTimeSlot(slot);
    }
  };
  
  const handleAppointmentTypeSelection = (type: string) => {
    setAppointmentType(type);
  };
  
  const handleConfirmAppointment = async () => {
    if (!selectedTimeSlot) {
      Alert.alert('Selection Required', 'Please select a time slot for your appointment.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const appointmentData = {
        patientId: user?.id,
        doctorId: doctorId,
        date: selectedDay ? formatDateForAPI(selectedDay.date) : '',
        timeSlotId: selectedTimeSlot.id,
        appointmentType: appointmentType,
        status: 'scheduled'
      };
      
      // Create appointment via API
      await appointmentService.createAppointment(appointmentData);
      
      Alert.alert(
        'Appointment Confirmed',
        `Your appointment with ${doctor?.name || 'the doctor'} is scheduled for ${selectedDay?.month || ''} ${selectedDay?.dayNum || ''} at ${selectedTimeSlot.time}.`,
        [{ 
          text: 'OK', 
          onPress: () => navigation.navigate('Appointments') 
        }]
      );
    } catch (error) {
      console.error('Failed to book appointment:', error);
      Alert.alert('Error', 'Failed to book appointment. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for API
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (!doctorId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Doctor information not found.</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && !doctor) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Doctor Info */}
      <View style={styles.doctorContainer}>
        <View style={styles.doctorInfo}>
          <Text style={styles.title}>Book Appointment</Text>
          <View style={styles.doctorRow}>
            <View>
              <Text style={styles.doctorName}>{doctor?.name}</Text>
              <Text style={styles.doctorSpecialty}>{doctor?.specialty}</Text>
              <Text style={styles.doctorHospital}>{doctor?.hospital || 'PulseCare Medical Center'}</Text>
            </View>
            <Text style={styles.doctorFee}>Consultation Fee: ${doctor?.fee || '150'}</Text>
          </View>
        </View>
      </View>
      
      {/* Calendar Days */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.daysContainer}
        >
          {days.map((day) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayItem,
                selectedDay?.id === day.id && styles.selectedDayItem,
                !day.available && styles.unavailableDayItem,
              ]}
              onPress={() => day.available && handleDaySelection(day)}
              disabled={!day.available}
            >
              <Text style={[
                styles.dayName,
                selectedDay?.id === day.id && styles.selectedDayText,
                !day.available && styles.unavailableDayText,
              ]}>
                {day.day}
              </Text>
              <Text style={[
                styles.dayNumber,
                selectedDay?.id === day.id && styles.selectedDayText,
                !day.available && styles.unavailableDayText,
              ]}>
                {day.dayNum}
              </Text>
              <Text style={[
                styles.monthText,
                selectedDay?.id === day.id && styles.selectedDayText,
                !day.available && styles.unavailableDayText,
              ]}>
                {day.month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Time Slots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Time</Text>
        
        {isLoading ? (
          <ActivityIndicator size="small" color="#007bff" style={styles.slotLoader} />
        ) : (
          <>
            {/* Morning Slots */}
            <Text style={styles.timeOfDay}>Morning</Text>
            <View style={styles.timeSlotContainer}>
              {timeSlots.morningSlots.length > 0 ? (
                timeSlots.morningSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot,
                      selectedTimeSlot?.id === slot.id && styles.selectedTimeSlot,
                      !slot.available && styles.unavailableTimeSlot,
                    ]}
                    onPress={() => handleTimeSelection(slot)}
                    disabled={!slot.available}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTimeSlot?.id === slot.id && styles.selectedTimeText,
                      !slot.available && styles.unavailableTimeText,
                    ]}>
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noSlotsText}>No morning slots available</Text>
              )}
            </View>
            
            {/* Afternoon Slots */}
            <Text style={styles.timeOfDay}>Afternoon</Text>
            <View style={styles.timeSlotContainer}>
              {timeSlots.afternoonSlots.length > 0 ? (
                timeSlots.afternoonSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot,
                      selectedTimeSlot?.id === slot.id && styles.selectedTimeSlot,
                      !slot.available && styles.unavailableTimeSlot,
                    ]}
                    onPress={() => handleTimeSelection(slot)}
                    disabled={!slot.available}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      selectedTimeSlot?.id === slot.id && styles.selectedTimeText,
                      !slot.available && styles.unavailableTimeText,
                    ]}>
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noSlotsText}>No afternoon slots available</Text>
              )}
            </View>
          </>
        )}
      </View>
      
      {/* Appointment Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Type</Text>
        <View style={styles.appointmentTypeContainer}>
          <TouchableOpacity
            style={[
              styles.appointmentTypeButton,
              appointmentType === 'in-person' && styles.selectedAppointmentType,
            ]}
            onPress={() => handleAppointmentTypeSelection('in-person')}
          >
            <Ionicons 
              name="person" 
              size={24} 
              color={appointmentType === 'in-person' ? '#fff' : '#007bff'} 
            />
            <Text style={[
              styles.appointmentTypeText,
              appointmentType === 'in-person' && styles.selectedAppointmentTypeText,
            ]}>
              In-Person
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.appointmentTypeButton,
              appointmentType === 'video' && styles.selectedAppointmentType,
            ]}
            onPress={() => handleAppointmentTypeSelection('video')}
          >
            <Ionicons 
              name="videocam" 
              size={24} 
              color={appointmentType === 'video' ? '#fff' : '#007bff'} 
            />
            <Text style={[
              styles.appointmentTypeText,
              appointmentType === 'video' && styles.selectedAppointmentTypeText,
            ]}>
              Video Consultation
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Confirm Button */}
      <TouchableOpacity 
        style={styles.confirmButton}
        onPress={handleConfirmAppointment}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
        )}
      </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  slotLoader: {
    marginVertical: 20,
  },
  doctorContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  doctorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  doctorHospital: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  doctorFee: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  daysContainer: {
    paddingBottom: 8,
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    marginRight: 10,
    padding: 10,
  },
  selectedDayItem: {
    backgroundColor: '#007bff',
  },
  unavailableDayItem: {
    backgroundColor: '#f0f0f0',
  },
  dayName: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  monthText: {
    fontSize: 12,
    color: '#666',
  },
  selectedDayText: {
    color: '#fff',
  },
  unavailableDayText: {
    color: '#999',
  },
  timeOfDay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  noSlotsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  timeSlot: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedTimeSlot: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  unavailableTimeSlot: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  selectedTimeText: {
    color: '#fff',
  },
  unavailableTimeText: {
    color: '#999',
  },
  appointmentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appointmentTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  selectedAppointmentType: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  appointmentTypeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  selectedAppointmentTypeText: {
    color: '#fff',
  },
  confirmButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 24,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PatientBookAppointmentScreen;
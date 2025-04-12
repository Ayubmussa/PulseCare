import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, doctorService } from '../../services/api';

interface Schedule {
  id: string;
  date: string;
  timeSlots: TimeSlot[];
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  appointmentId?: string;
  patientName?: string;
  reason?: string;
}

const DoctorScheduleScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [week, setWeek] = useState<Date[]>([]);
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  // Generate dates for the week view
  useEffect(() => {
    const weekDates = getWeekDates(selectedDate);
    setWeek(weekDates);
  }, [selectedDate]);

  // Load schedule for selected date
  useEffect(() => {
    if (user?.id) {
      loadScheduleForDate(formatDateForAPI(selectedDate));
    }
  }, [selectedDate, user?.id]);

  const getWeekDates = (date: Date): Date[] => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    
    const mondayDate = new Date(date);
    mondayDate.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(mondayDate);
      nextDate.setDate(mondayDate.getDate() + i);
      weekDates.push(nextDate);
    }
    
    return weekDates;
  };

  // Function to get doctor schedule for a specific date
  const getDoctorScheduleForDate = async (doctorId: string, dateString: string): Promise<Schedule> => {
    try {
      // Get doctor's availability
      const doctorData = await doctorService.getDoctorById(doctorId);
      
      // Get appointments for this date
      const startDate = dateString;
      const endDate = dateString; // Same day for single day view
      const appointments = await appointmentService.getAppointmentsByDateRange(startDate, endDate);
      
      // Filter appointments for this doctor
      const doctorAppointments = appointments.filter((apt: any) => apt.doctorId === doctorId);
      
      // Create schedule with time slots based on doctor's availability for this day
      const dayOfWeek = new Date(dateString).getDay(); // 0 = Sunday, 1 = Monday, ...
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      // Extract availability for this day (assuming doctorData has availability property)
      const dayAvailability = doctorData.availability?.[dayName] || [];
      
      // Create time slots from availability
      const timeSlots = dayAvailability.map((slot: any) => {
        // Find if there's an appointment for this time slot
        const matchingAppointment = doctorAppointments.find((apt: any) => 
          apt.time === slot.startTime // Assuming appointment has a time field matching startTime
        );
        
        return {
          id: slot.id || `${dateString}-${slot.startTime}`, // Generate ID if not available
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: !!matchingAppointment,
          appointmentId: matchingAppointment?.id,
          patientName: matchingAppointment?.patientName,
          reason: matchingAppointment?.reason
        };
      });
      
      return {
        id: `schedule-${doctorId}-${dateString}`,
        date: dateString,
        timeSlots: timeSlots
      };
    } catch (error) {
      console.error('Error getting doctor schedule:', error);
      throw error;
    }
  };

  const loadScheduleForDate = async (dateString: string) => {
    try {
      setIsLoading(true);
      
      if (user?.id) {
        const scheduleData = await getDoctorScheduleForDate(user.id, dateString);
        setSchedule(scheduleData);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
      Alert.alert('Error', 'Failed to load schedule information');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToAppointmentDetails = (appointmentId: string) => {
    navigation.navigate('AppointmentDetails', { id: appointmentId });
  };

  const navigateToAddSchedule = () => {
    navigation.navigate('AddSchedule', {
      date: formatDateForAPI(selectedDate),
      onReturn: () => loadScheduleForDate(formatDateForAPI(selectedDate))
    });
  };

  const navigateToManageSchedule = () => {
    navigation.navigate('ManageSchedule', {
      scheduleId: schedule?.id,
      date: formatDateForAPI(selectedDate),
      onReturn: () => loadScheduleForDate(formatDateForAPI(selectedDate))
    });
  };

  const navigateToNextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(selectedDate.getDate() + 7);
    setSelectedDate(nextWeek);
  };

  const navigateToPreviousWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(selectedDate.getDate() - 7);
    setSelectedDate(prevWeek);
  };

  // Format date for display
  const formatDateDisplay = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDayDisplay = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Format date for API
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date): boolean => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  // Format time for display
  const formatTimeDisplay = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNavigationContainer}>
        <TouchableOpacity 
          style={styles.navigationButton}
          onPress={navigateToPreviousWeek}
        >
          <Ionicons name="chevron-back" size={24} color="#007bff" />
        </TouchableOpacity>
        
        <Text style={styles.weekRangeText}>
          {formatDateDisplay(week[0])} - {formatDateDisplay(week[6])}
        </Text>
        
        <TouchableOpacity 
          style={styles.navigationButton}
          onPress={navigateToNextWeek}
        >
          <Ionicons name="chevron-forward" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
      
      {/* Week Day Selector */}
      <View style={styles.weekContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={week}
          keyExtractor={(item) => item.toISOString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dayButton,
                isSelected(item) && styles.selectedDay,
                isToday(item) && styles.todayButton
              ]}
              onPress={() => setSelectedDate(item)}
            >
              <Text style={[
                styles.dayText, 
                isSelected(item) && styles.selectedDayText
              ]}>
                {formatDayDisplay(item)}
              </Text>
              <Text style={[
                styles.dateText, 
                isSelected(item) && styles.selectedDayText
              ]}>
                {item.getDate()}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      
      {/* Schedule Content */}
      <View style={styles.contentContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
        ) : (
          <>
            <View style={styles.headerContainer}>
              <Text style={styles.dateHeaderText}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              
              <View style={styles.headerButtonsContainer}>
                {!schedule && (
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={navigateToAddSchedule}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" />
                    <Text style={styles.addButtonText}>Add Schedule</Text>
                  </TouchableOpacity>
                )}
                
                {schedule && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={navigateToManageSchedule}
                  >
                    <Ionicons name="create-outline" size={16} color="#007bff" />
                    <Text style={styles.editButtonText}>Manage</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {!schedule ? (
              <View style={styles.noScheduleContainer}>
                <Ionicons name="calendar-outline" size={60} color="#adb5bd" />
                <Text style={styles.noScheduleText}>No schedule set for this day</Text>
                <TouchableOpacity 
                  style={styles.noScheduleButton}
                  onPress={navigateToAddSchedule}
                >
                  <Text style={styles.noScheduleButtonText}>Create Schedule</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.timeSlotContainer}>
                {schedule.timeSlots.length === 0 ? (
                  <View style={styles.emptyScheduleContainer}>
                    <Text style={styles.emptyScheduleText}>
                      No time slots added for this day
                    </Text>
                    <TouchableOpacity 
                      style={styles.addSlotsButton}
                      onPress={navigateToManageSchedule}
                    >
                      <Text style={styles.addSlotsButtonText}>Add Time Slots</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  schedule.timeSlots.map((slot, index) => (
                    <TouchableOpacity 
                      key={slot.id}
                      style={[
                        styles.timeSlot,
                        slot.isBooked ? styles.bookedSlot : styles.availableSlot,
                        index === schedule.timeSlots.length - 1 && styles.lastTimeSlot
                      ]}
                      onPress={() => {
                        if (slot.isBooked && slot.appointmentId) {
                          navigateToAppointmentDetails(slot.appointmentId);
                        }
                      }}
                      disabled={!slot.isBooked}
                    >
                      <View style={styles.timeContainer}>
                        <Text style={styles.timeText}>
                          {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                        </Text>
                      </View>
                      
                      {slot.isBooked ? (
                        <View style={styles.appointmentInfoContainer}>
                          <Text style={styles.patientName}>{slot.patientName}</Text>
                          <Text style={styles.appointmentReason}>{slot.reason}</Text>
                          
                          <View style={styles.statusContainer}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>Booked</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.availableContainer}>
                          <View style={[styles.statusDot, styles.availableDot]} />
                          <Text style={styles.availableText}>Available</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  weekNavigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  navigationButton: {
    padding: 8,
  },
  weekRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  weekContainer: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  dayButton: {
    alignItems: 'center',
    padding: 12,
    width: 65,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#007bff',
  },
  todayButton: {
    borderWidth: 1,
    borderColor: '#007bff',
  },
  dayText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  selectedDayText: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#007bff',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#007bff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  noScheduleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noScheduleText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 24,
  },
  noScheduleButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  noScheduleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  timeSlotContainer: {
    flex: 1,
  },
  emptyScheduleContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyScheduleText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  addSlotsButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addSlotsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlot: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  lastTimeSlot: {
    marginBottom: 0,
  },
  bookedSlot: {
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  availableSlot: {
    borderLeftWidth: 4,
    borderLeftColor: '#6c757d',
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  appointmentInfoContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  appointmentReason: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    marginRight: 6,
  },
  availableDot: {
    backgroundColor: '#6c757d',
  },
  statusText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  availableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  availableText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
});

export default DoctorScheduleScreen;
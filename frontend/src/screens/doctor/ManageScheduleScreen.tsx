import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/api';

interface TimeSlot {
  id?: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface WeeklyAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

// Define route params interface
interface RouteParams {
  scheduleId?: string;
  date?: string;
  onReturn?: () => void;
}

const ManageScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { scheduleId, date, onReturn } = route.params || {};
  
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [availability, setAvailability] = useState<WeeklyAvailability>({
    monday: { isAvailable: false, timeSlots: [] },
    tuesday: { isAvailable: false, timeSlots: [] },
    wednesday: { isAvailable: false, timeSlots: [] },
    thursday: { isAvailable: false, timeSlots: [] },
    friday: { isAvailable: false, timeSlots: [] },
    saturday: { isAvailable: false, timeSlots: [] },
    sunday: { isAvailable: false, timeSlots: [] },
  });
  
  // Initialize selected day based on route params date or default to Monday
  const [selectedDay, setSelectedDay] = useState<keyof WeeklyAvailability>(() => {
    if (date) {
      const dayIndex = new Date(date).getDay();
      const dayNames: Array<keyof WeeklyAvailability> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return dayNames[dayIndex];
    }
    return 'monday';
  });
  
  const [showStartTimePicker, setShowStartTimePicker] = useState<boolean>(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState<boolean>(false);
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>({
    startTime: '09:00',
    endTime: '10:00',
  });
  const [slotDuration, setSlotDuration] = useState<string>('30'); // Duration in minutes

  const dayNames: Record<keyof WeeklyAvailability, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  // Fetch doctor's current availability settings
  useEffect(() => {
    if (user?.id) {
      fetchDoctorAvailability();
    }
  }, [user?.id]);

  const fetchDoctorAvailability = async () => {
    try {
      setLoading(true);
      // Add null check to ensure user.id is defined
      if (!user?.id) {
        throw new Error('User ID is not defined');
      }
      
      const doctorData = await doctorService.getDoctorById(user.id);
      
      if (doctorData && doctorData.availability) {
        setAvailability(prevAvailability => {
          // Create a new availability object
          const newAvailability = { ...prevAvailability };
          
          // Update each day's availability from the fetched data
          Object.keys(doctorData.availability).forEach((day) => {
            if (day in newAvailability) {
              const dayKey = day as keyof WeeklyAvailability;
              newAvailability[dayKey] = {
                isAvailable: doctorData.availability[dayKey].length > 0,
                timeSlots: doctorData.availability[dayKey] || []
              };
            }
          });
          
          return newAvailability;
        });
      }
    } catch (error) {
      console.error('Failed to fetch doctor availability:', error);
      Alert.alert('Error', 'Failed to load your availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      
      // Add null check to ensure user.id is defined
      if (!user?.id) {
        throw new Error('User ID is not defined');
      }
      
      // Format the availability data as expected by the API
      const formattedAvailability = Object.keys(availability).reduce((acc, day) => {
        const dayKey = day as keyof WeeklyAvailability;
        acc[dayKey] = availability[dayKey].isAvailable ? availability[dayKey].timeSlots : [];
        return acc;
      }, {} as Record<string, TimeSlot[]>);
      
      // Save the availability
      await doctorService.updateAvailability(user.id, { availability: formattedAvailability });
      
      Alert.alert('Success', 'Your availability has been updated');
      
      // Call the onReturn callback if provided
      if (onReturn && typeof onReturn === 'function') {
        onReturn();
      }
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error saving availability:', error);
      Alert.alert('Error', 'Failed to save your availability');
    } finally {
      setSaving(false);
    }
  };

  const handleDayToggle = (day: keyof WeeklyAvailability) => {
    setAvailability(prevAvailability => ({
      ...prevAvailability,
      [day]: {
        ...prevAvailability[day],
        isAvailable: !prevAvailability[day].isAvailable
      }
    }));
  };

  const handleDaySelection = (day: keyof WeeklyAvailability) => {
    setSelectedDay(day);
  };

  const handleAddTimeSlot = () => {
    const newSlot = { ...newTimeSlot };
    
    // Check if time slot is valid
    if (!isTimeSlotValid(newSlot)) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }
    
    // Check for overlapping time slots
    if (hasOverlappingSlots(selectedDay, newSlot)) {
      Alert.alert('Overlapping Times', 'This time slot overlaps with an existing slot');
      return;
    }
    
    // Generate unique ID for the new slot
    newSlot.id = `${selectedDay}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    setAvailability(prevAvailability => ({
      ...prevAvailability,
      [selectedDay]: {
        ...prevAvailability[selectedDay],
        timeSlots: [...prevAvailability[selectedDay].timeSlots, newSlot]
      }
    }));
  };

  const handleRemoveTimeSlot = (slotId: string) => {
    setAvailability(prevAvailability => ({
      ...prevAvailability,
      [selectedDay]: {
        ...prevAvailability[selectedDay],
        timeSlots: prevAvailability[selectedDay].timeSlots.filter(slot => slot.id !== slotId)
      }
    }));
  };

  const handleGenerateTimeSlots = () => {
    if (!newTimeSlot.startTime || !newTimeSlot.endTime || !slotDuration) {
      Alert.alert('Missing Information', 'Please set start time, end time, and duration');
      return;
    }
    
    const startMinutes = timeStringToMinutes(newTimeSlot.startTime);
    const endMinutes = timeStringToMinutes(newTimeSlot.endTime);
    const duration = parseInt(slotDuration, 10);
    
    if (startMinutes >= endMinutes) {
      Alert.alert('Invalid Time Range', 'End time must be after start time');
      return;
    }
    
    // Generate time slots based on duration
    const generatedSlots: TimeSlot[] = [];
    let currentStartMinutes = startMinutes;
    
    while (currentStartMinutes + duration <= endMinutes) {
      const slotStartTime = minutesToTimeString(currentStartMinutes);
      const slotEndTime = minutesToTimeString(currentStartMinutes + duration);
      
      generatedSlots.push({
        id: `${selectedDay}-${Date.now()}-${currentStartMinutes}`,
        startTime: slotStartTime,
        endTime: slotEndTime
      });
      
      currentStartMinutes += duration;
    }
    
    if (generatedSlots.length === 0) {
      Alert.alert('No Slots Generated', 'The time range is too small for the selected duration');
      return;
    }
    
    // Update availability with generated slots
    setAvailability(prevAvailability => ({
      ...prevAvailability,
      [selectedDay]: {
        ...prevAvailability[selectedDay],
        isAvailable: true,
        timeSlots: generatedSlots
      }
    }));
    
    Alert.alert('Success', `Generated ${generatedSlots.length} time slots`);
  };

  const handleCopyToAllDays = () => {
    Alert.alert(
      'Copy Schedule',
      'Do you want to copy this day\'s schedule to all other days?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            const sourceDaySlots = [...availability[selectedDay].timeSlots];
            
            setAvailability(prevAvailability => {
              const newAvailability = { ...prevAvailability };
              
              Object.keys(prevAvailability).forEach(day => {
                if (day !== selectedDay) {
                  const dayKey = day as keyof WeeklyAvailability;
                  newAvailability[dayKey] = {
                    isAvailable: sourceDaySlots.length > 0,
                    timeSlots: sourceDaySlots.map(slot => ({
                      ...slot,
                      id: `${day}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
                    }))
                  };
                }
              });
              
              return newAvailability;
            });
          }
        }
      ]
    );
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined, type: 'start' | 'end') => {
    // Close the pickers first
    if (type === 'start') {
      setShowStartTimePicker(false);
    } else {
      setShowEndTimePicker(false);
    }
    
    // Only update the time if a selection was made
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      setNewTimeSlot(prev => ({
        ...prev,
        [type === 'start' ? 'startTime' : 'endTime']: timeString
      }));
    }
  };

  // Utility functions
  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const minutesToTimeString = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  const isTimeSlotValid = (slot: TimeSlot): boolean => {
    const startMinutes = timeStringToMinutes(slot.startTime);
    const endMinutes = timeStringToMinutes(slot.endTime);
    return startMinutes < endMinutes;
  };
  
  const hasOverlappingSlots = (day: keyof WeeklyAvailability, newSlot: TimeSlot): boolean => {
    const newStart = timeStringToMinutes(newSlot.startTime);
    const newEnd = timeStringToMinutes(newSlot.endTime);
    
    return availability[day].timeSlots.some(slot => {
      const existingStart = timeStringToMinutes(slot.startTime);
      const existingEnd = timeStringToMinutes(slot.endTime);
      
      // Check if the new slot overlaps with an existing slot
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  const formatTimeDisplay = (timeStr: string): string => {
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${hours12}:${minutes} ${period}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading availability settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Availability</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveAvailability}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Day Selector */}
        <View style={styles.daySelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(availability).map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  selectedDay === day && styles.selectedDayButton,
                  availability[day as keyof WeeklyAvailability].isAvailable && styles.availableDayButton
                ]}
                onPress={() => handleDaySelection(day as keyof WeeklyAvailability)}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDay === day && styles.selectedDayButtonText
                ]}>
                  {dayNames[day as keyof WeeklyAvailability].substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Selected Day Settings */}
        <View style={styles.daySettings}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{dayNames[selectedDay]}</Text>
            <View style={styles.availabilityToggle}>
              <Text style={styles.availabilityLabel}>
                {availability[selectedDay].isAvailable ? 'Available' : 'Not Available'}
              </Text>
              <Switch
                value={availability[selectedDay].isAvailable}
                onValueChange={() => handleDayToggle(selectedDay)}
                trackColor={{ false: '#dedede', true: '#a5d6a7' }}
                thumbColor={availability[selectedDay].isAvailable ? '#4caf50' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Time Slot Generation */}
          {availability[selectedDay].isAvailable && (
            <>
              <View style={styles.timeSlotsHeader}>
                <Text style={styles.sectionTitle}>Generate Time Slots</Text>
              </View>
              
              <View style={styles.timeSlotCreator}>
                <View style={styles.timeInputRow}>
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeInputLabel}>Start Time</Text>
                    <TouchableOpacity 
                      style={styles.timeInput}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.timeInputText}>
                        {formatTimeDisplay(newTimeSlot.startTime)}
                      </Text>
                      <Ionicons name="time-outline" size={20} color="#6c757d" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.timeInputContainer}>
                    <Text style={styles.timeInputLabel}>End Time</Text>
                    <TouchableOpacity 
                      style={styles.timeInput}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.timeInputText}>
                        {formatTimeDisplay(newTimeSlot.endTime)}
                      </Text>
                      <Ionicons name="time-outline" size={20} color="#6c757d" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.slotDurationContainer}>
                  <Text style={styles.timeInputLabel}>Slot Duration (minutes)</Text>
                  <TextInput
                    style={styles.durationInput}
                    value={slotDuration}
                    onChangeText={setSlotDuration}
                    keyboardType="number-pad"
                    placeholder="30"
                    maxLength={3}
                  />
                </View>
                
                <View style={styles.timeSlotActions}>
                  <TouchableOpacity 
                    style={styles.generateButton}
                    onPress={handleGenerateTimeSlots}
                  >
                    <Text style={styles.generateButtonText}>Generate Time Slots</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.addSlotButton}
                    onPress={handleAddTimeSlot}
                  >
                    <Ionicons name="add" size={20} color="#ffffff" />
                    <Text style={styles.addSlotButtonText}>Add Single Slot</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={handleCopyToAllDays}
                >
                  <Ionicons name="copy-outline" size={18} color="#007bff" />
                  <Text style={styles.copyButtonText}>Copy to All Days</Text>
                </TouchableOpacity>
              </View>

              {/* Current Time Slots */}
              <View style={styles.currentSlots}>
                <Text style={styles.sectionTitle}>
                  Current Time Slots ({availability[selectedDay].timeSlots.length})
                </Text>
                
                {availability[selectedDay].timeSlots.length === 0 ? (
                  <View style={styles.emptySlots}>
                    <Text style={styles.emptySlotsText}>No time slots added yet</Text>
                  </View>
                ) : (
                  availability[selectedDay].timeSlots
                    .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime))
                    .map((slot, index) => (
                      <View key={slot.id || index} style={styles.slotItem}>
                        <Text style={styles.slotTime}>
                          {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                        </Text>
                        <TouchableOpacity
                          style={styles.removeSlotButton}
                          onPress={() => handleRemoveTimeSlot(slot.id || '')}
                        >
                          <Ionicons name="close" size={20} color="#dc3545" />
                        </TouchableOpacity>
                      </View>
                    ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = newTimeSlot.startTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => handleTimeChange(event, date, 'start')}
        />
      )}
      
      {showEndTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = newTimeSlot.endTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => handleTimeChange(event, date, 'end')}
        />
      )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  daySelector: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  selectedDayButton: {
    backgroundColor: '#007bff',
  },
  availableDayButton: {
    borderWidth: 1,
    borderColor: '#28a745',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  selectedDayButtonText: {
    color: '#ffffff',
  },
  daySettings: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityLabel: {
    marginRight: 8,
    fontSize: 14,
    color: '#6c757d',
  },
  timeSlotsHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  timeSlotCreator: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  timeInputLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timeInputText: {
    fontSize: 16,
    color: '#212529',
  },
  slotDurationContainer: {
    marginBottom: 16,
  },
  durationInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  timeSlotActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  generateButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  addSlotButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
  },
  addSlotButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  copyButtonText: {
    color: '#007bff',
    fontSize: 14,
    marginLeft: 6,
  },
  currentSlots: {
    marginTop: 8,
  },
  emptySlots: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptySlotsText: {
    fontSize: 14,
    color: '#6c757d',
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  slotTime: {
    fontSize: 16,
    color: '#212529',
  },
  removeSlotButton: {
    padding: 6,
  },
});

export default ManageScheduleScreen;
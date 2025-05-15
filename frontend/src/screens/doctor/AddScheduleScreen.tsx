import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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

interface RouteParams {
  date: string;
  onReturn: () => void;
}

const AddScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const params = route.params as RouteParams | undefined;
  const date = params?.date || new Date().toISOString();
  const onReturn = params?.onReturn;
  const { user } = useAuth();
  
  // Show warning if date parameter is missing
  useEffect(() => {
    if (!params?.date) {
      console.warn('AddScheduleScreen: Missing date parameter, using current date');
    }
  }, [params]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showStartTimePicker, setShowStartTimePicker] = useState<boolean>(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState<boolean>(false);
  const [newSlot, setNewSlot] = useState<TimeSlot>({
    startTime: '09:00',
    endTime: '09:30',
  });
  const [slotDuration, setSlotDuration] = useState<string>('30'); // Duration in minutes

  const handleAddSlot = () => {
    if (!isValidTimeSlot(newSlot)) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    // Check for overlapping time slots
    if (hasOverlappingSlots(newSlot)) {
      Alert.alert('Overlapping Times', 'This time slot overlaps with an existing slot');
      return;
    }
    
    const slot = {
      ...newSlot,
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    setTimeSlots([...timeSlots, slot]);
  };

  const handleRemoveSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
  };

  const handleGenerateTimeSlots = () => {
    if (!newSlot.startTime || !newSlot.endTime || !slotDuration) {
      Alert.alert('Missing Information', 'Please set start time, end time, and duration');
      return;
    }
    
    const startMinutes = timeStringToMinutes(newSlot.startTime);
    const endMinutes = timeStringToMinutes(newSlot.endTime);
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
        id: `slot-${Date.now()}-${currentStartMinutes}`,
        startTime: slotStartTime,
        endTime: slotEndTime
      });
      
      currentStartMinutes += duration;
    }
    
    if (generatedSlots.length === 0) {
      Alert.alert('No Slots Generated', 'The time range is too small for the selected duration');
      return;
    }
    
    // Update time slots
    setTimeSlots(generatedSlots);
    
    Alert.alert('Success', `Generated ${generatedSlots.length} time slots`);
  };

  const handleSaveSchedule = async () => {
    if (timeSlots.length === 0) {
      Alert.alert('No Time Slots', 'Please add at least one time slot');
      return;
    }

    if (!user?.id) {
      Alert.alert('Authentication Error', 'User ID not found. Please login again.');
      return;
    }

    try {
      setIsSaving(true);
      
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      // Get doctor's current availability
      const doctorData = await doctorService.getDoctorById(user.id);
      const currentAvailability = doctorData.availability || {};
      
      // Update the specific day's availability
      const updatedAvailability = {
        ...currentAvailability,
        [dayName]: timeSlots
      };
      
      // Save the updated availability
      await doctorService.updateAvailability(user.id, { availability: updatedAvailability });
      
      Alert.alert('Success', 'Schedule updated successfully');
      
      // Call the onReturn callback and navigate back
      if (onReturn) {
        onReturn();
      }
      navigation.goBack();
      
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined, type: 'start' | 'end') => {
    if (type === 'start') {
      setShowStartTimePicker(false);
    } else {
      setShowEndTimePicker(false);
    }
    
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      setNewSlot(prev => ({
        ...prev,
        [type === 'start' ? 'startTime' : 'endTime']: timeString
      }));
    }
  };

  // Helper functions
  const isValidTimeSlot = (slot: TimeSlot): boolean => {
    const startMinutes = timeStringToMinutes(slot.startTime);
    const endMinutes = timeStringToMinutes(slot.endTime);
    return startMinutes < endMinutes;
  };
  
  const hasOverlappingSlots = (newSlot: TimeSlot): boolean => {
    const newStart = timeStringToMinutes(newSlot.startTime);
    const newEnd = timeStringToMinutes(newSlot.endTime);
    
    return timeSlots.some(slot => {
      const existingStart = timeStringToMinutes(slot.startTime);
      const existingEnd = timeStringToMinutes(slot.endTime);
      
      // Check if the new slot overlaps with an existing slot
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };
  
  const timeStringToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const minutesToTimeString = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  const formatTimeDisplay = (timeStr: string): string => {
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${hours12}:${minutes} ${period}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Schedule</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveSchedule}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.dateCard}>
          <Ionicons name="calendar" size={24} color="#007bff" />
          <Text style={styles.dateText}>
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Time Slot Generation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Time Slots</Text>
          <View style={styles.timeSlotCreator}>
            <View style={styles.timeInputRow}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeInputLabel}>Start Time</Text>
                <TouchableOpacity 
                  style={styles.timeInput}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={styles.timeInputText}>
                    {formatTimeDisplay(newSlot.startTime)}
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
                    {formatTimeDisplay(newSlot.endTime)}
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
                onPress={handleAddSlot}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
                <Text style={styles.addSlotButtonText}>Add Single Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Time Slots List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Time Slots ({timeSlots.length})
          </Text>
          
          {timeSlots.length === 0 ? (
            <View style={styles.emptySlots}>
              <Text style={styles.emptySlotsText}>No time slots added yet</Text>
            </View>
          ) : (
            timeSlots
              .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime))
              .map((slot) => (
                <View key={slot.id} style={styles.slotItem}>
                  <Text style={styles.slotTime}>
                    {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeSlotButton}
                    onPress={() => handleRemoveSlot(slot.id || '')}
                  >
                    <Ionicons name="close" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = newSlot.startTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, date) => handleTimeChange(event, date, 'start')}
        />
      )}
      
      {showEndTimePicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = newSlot.endTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={true}
          display="default"
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
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
    padding: 16,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  timeSlotCreator: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
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

export default AddScheduleScreen;
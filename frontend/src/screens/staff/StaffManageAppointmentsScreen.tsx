import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../services/api';

// Define interfaces for our data structures
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'checked-in' | 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type?: 'regular' | 'urgent' | 'follow-up';
  department?: string;
  reason?: string;
}

interface FilterParams {
  date?: string;
  status?: string;
  doctorId?: string;
  patientId?: string;
}

const StaffManageAppointmentsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  
  // State variables
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [statusUpdateNotes, setStatusUpdateNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterParams>({});
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // Today's date
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Load appointments when component mounts
  useEffect(() => {
    fetchAppointments();
  }, []);
  
  // Apply filters when appointments, searchQuery or filters change
  useEffect(() => {
    applyFilters();
  }, [appointments, searchQuery, filters]);

  // Fetch appointments from API
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaffAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to appointments
  const applyFilters = () => {
    let filtered = [...appointments];
    
    // Apply date filter
    if (filters.date) {
      filtered = filtered.filter(appointment => appointment.date === filters.date);
    }
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(appointment => appointment.status === filters.status);
    }
    
    // Apply doctor filter
    if (filters.doctorId) {
      filtered = filtered.filter(appointment => appointment.doctorId === filters.doctorId);
    }
    
    // Apply patient filter
    if (filters.patientId) {
      filtered = filtered.filter(appointment => appointment.patientId === filters.patientId);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(appointment => 
        appointment.patientName.toLowerCase().includes(query) ||
        appointment.doctorName.toLowerCase().includes(query) ||
        (appointment.reason && appointment.reason.toLowerCase().includes(query))
      );
    }
    
    setFilteredAppointments(filtered);
  };

  // Handle search query changes
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  // Handle filter date change
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      setFilterDate(selectedDate);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setFilters(prev => ({ ...prev, date: formattedDate }));
    }
  };

  // Handle filter status change
  const handleStatusFilter = (status: string) => {
    setFilterStatus(status);
    setFilters(prev => ({ ...prev, status: status || undefined }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterDate(null);
    setFilterStatus('');
    setFilters({});
    setFilterModalVisible(false);
  };

  // Navigate to appointment details screen
  const navigateToAppointmentDetails = (appointmentId: string) => {
    navigation.navigate('StaffAppointmentDetails', { id: appointmentId });
  };

  // Handle appointment status update
  const handleUpdateStatus = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setStatusUpdateNotes('');
    setStatusModalVisible(true);
  };

  // Confirm appointment status update
  const confirmUpdateStatus = async (newStatus: string) => {
    if (!selectedAppointment || !user) return;
    
    try {
      setActionLoading(true);
      
      await staffService.updateAppointmentStatus(
        selectedAppointment.id,
        newStatus as any,
        user.id,
        statusUpdateNotes
      );
      
      // Update local state
      const updatedAppointments = appointments.map(apt => {
        if (apt.id === selectedAppointment.id) {
          return { ...apt, status: newStatus as any };
        }
        return apt;
      });
      
      setAppointments(updatedAppointments);
      
      // Close modal
      setStatusModalVisible(false);
      setSelectedAppointment(null);
      
      Alert.alert('Success', `Appointment status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update appointment status:', error);
      Alert.alert('Error', 'Failed to update appointment status. Please try again.');
    } finally {
      setActionLoading(false);
    }
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

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#007bff';
      case 'checked-in':
        return '#6f42c1';
      case 'pending':
        return '#ffc107';
      case 'scheduled':
        return '#17a2b8';
      case 'completed':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      case 'no-show':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  // Render appointment card
  const renderAppointmentCard = (appointment: Appointment) => {
    const isToday = appointment.date === todayStr;
    
    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigateToAppointmentDetails(appointment.id)}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.dateText}>
              {formatDate(appointment.date)}
              {isToday && <Text style={styles.todayBadge}> Today</Text>}
            </Text>
            <Text style={styles.timeText}>{formatTime(appointment.time)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(appointment.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(appointment.status)}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentBody}>
          <View style={styles.patientInfoContainer}>
            <Ionicons name="person" size={16} color="#6c757d" />
            <Text style={styles.nameText}>{appointment.patientName}</Text>
          </View>
          <View style={styles.doctorInfoContainer}>
            <Ionicons name="medical" size={16} color="#6c757d" />
            <Text style={styles.nameText}>{appointment.doctorName}</Text>
          </View>
          {appointment.reason && (
            <View style={styles.reasonContainer}>
              <Ionicons name="document-text-outline" size={16} color="#6c757d" />
              <Text style={styles.reasonText} numberOfLines={1}>
                {appointment.reason}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.appointmentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUpdateStatus(appointment)}
          >
            <Ionicons name="sync" size={16} color="#007bff" />
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>All Appointments</Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search appointments..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#adb5bd"
          />
          <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
            <View style={styles.filterIconContainer}>
              <Ionicons name="filter" size={24} color="#007bff" />
              {(filters.date || filters.status) && (
                <View style={styles.filterBadge} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's stats summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.filter(apt => apt.date === todayStr).length}
          </Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.filter(apt => apt.status === 'checked-in' && apt.date === todayStr).length}
          </Text>
          <Text style={styles.statLabel}>Checked In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {appointments.filter(apt => apt.status === 'pending' || apt.status === 'scheduled').length}
          </Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Appointment list */}
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderAppointmentCard(item)}
        contentContainerStyle={styles.appointmentsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar" size={60} color="#dee2e6" />
            <Text style={styles.emptyStateText}>No appointments found</Text>
            <Text style={styles.emptyStateSubText}>
              {searchQuery || Object.keys(filters).length > 0
                ? "Try adjusting your search or filters"
                : "Add an appointment to get started"}
            </Text>
          </View>
        }
      />

      {/* Add Appointment Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddAppointment')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Appointments</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {/* Date filter */}
              <Text style={styles.filterSectionTitle}>Date</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#6c757d" />
                <Text style={styles.datePickerButtonText}>
                  {filterDate ? format(filterDate, 'MMMM d, yyyy') : 'Select a date'}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={filterDate || today}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              {/* Status filter */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.statusFilters}>
                {['', 'confirmed', 'checked-in', 'scheduled', 'pending', 'completed', 'cancelled', 'no-show'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusFilterOption,
                      filterStatus === status && styles.activeStatusFilter,
                      status === '' && styles.allStatusOption
                    ]}
                    onPress={() => handleStatusFilter(status)}
                  >
                    <Text 
                      style={[
                        styles.statusFilterText,
                        filterStatus === status && styles.activeStatusFilterText
                      ]}
                    >
                      {status === '' ? 'All' : getStatusText(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filter actions */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={[styles.filterButton, styles.clearButton]}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearButtonText}>Clear Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, styles.applyButton]}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Appointment Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {selectedAppointment && (
              <View style={styles.statusModalBody}>
                <Text style={styles.statusModalText}>
                  {selectedAppointment.patientName} - {formatDate(selectedAppointment.date)} at {formatTime(selectedAppointment.time)}
                </Text>
                <Text style={styles.statusModalSubText}>
                  Current Status: <Text style={{ fontWeight: 'bold' }}>{getStatusText(selectedAppointment.status)}</Text>
                </Text>
                
                <Text style={styles.statusModalLabel}>Select New Status:</Text>
                <View style={styles.statusOptions}>
                  {['scheduled', 'confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        { backgroundColor: getStatusColor(status) }
                      ]}
                      onPress={() => confirmUpdateStatus(status)}
                      disabled={actionLoading}
                    >
                      <Text style={styles.statusOptionText}>{getStatusText(status)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.statusModalLabel}>Add Notes (Optional):</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes about this status change"
                  value={statusUpdateNotes}
                  onChangeText={setStatusUpdateNotes}
                  multiline={true}
                  numberOfLines={3}
                  editable={!actionLoading}
                />
                
                {actionLoading && (
                  <ActivityIndicator style={styles.loadingIndicator} color="#007bff" />
                )}
              </View>
            )}
          </View>
        </View>
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
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#212529',
  },
  filterIconContainer: {
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: '31%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  appointmentsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80, // Extra space for the FAB
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'column',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  todayBadge: {
    color: '#007bff',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  appointmentBody: {
    marginBottom: 12,
  },
  patientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  doctorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#343a40',
    marginLeft: 8,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
    flex: 1,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#e9f5ff',
  },
  actionButtonText: {
    color: '#007bff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007bff',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 12,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#343a40',
    marginTop: 12,
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  datePickerButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#212529',
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statusFilterOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    marginRight: 8,
    marginBottom: 8,
  },
  allStatusOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activeStatusFilter: {
    backgroundColor: '#007bff',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#495057',
  },
  activeStatusFilterText: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#e9ecef',
    marginRight: 8,
  },
  clearButtonText: {
    color: '#495057',
    fontWeight: '500',
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#007bff',
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  statusModalBody: {
    marginTop: 8,
  },
  statusModalText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#343a40',
    marginBottom: 8,
  },
  statusModalSubText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  statusModalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#343a40',
    marginBottom: 8,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  statusOptionText: {
    color: '#fff',
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#343a40',
    borderWidth: 1,
    borderColor: '#dee2e6',
    textAlignVertical: 'top',
  },
  loadingIndicator: {
    marginVertical: 16,
  }
});

export default StaffManageAppointmentsScreen;
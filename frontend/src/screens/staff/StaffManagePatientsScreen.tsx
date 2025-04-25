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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { patientService, appointmentService, staffService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Define interfaces for our data structures
interface Patient {
  id: string;
  name: string;
  age?: number;
  dateOfBirth?: string; // Added for backend compatibility
  gender?: string;
  status: 'active' | 'inactive';
  medicalConditions?: string[];
  email?: string;
  phone?: string;
  phoneNumber?: string; // Added for backend compatibility
  address?: string;
  bloodType?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
  };
  upcomingAppointment?: string | null;
  lastVisit?: string | null;
}

interface Appointment {
  id: string;
  date: string;
  patientId: string;
  doctorId: string;
  status: string;
  time: string;
}

// Define the navigation type
type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
}

const StaffManagePatientsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<{[key: string]: Appointment[]}>({});
  
  useEffect(() => {
    fetchPatients();
  }, []);
  
  // Apply filters when patients or search query changes
  useEffect(() => {
    applyFilters();
  }, [patients, searchQuery, selectedFilter]);
  
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use staffService.getAllPatients instead of patientService.getAllPatients
      const patientsData = await staffService.getAllPatients();
      
      // Process and normalize the data from the backend
      const normalizedPatients = patientsData.map((patient: any) => ({
        ...patient,
        // Handle different field names
        phone: patient.phoneNumber || patient.phone || '',
        // Ensure status is in expected format
        status: patient.status || 'active',
        // Calculate age from dateOfBirth if provided and age is missing
        age: patient.age || (patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined)
      }));
      
      // Process patients to include additional info like appointments
      const enhancedPatients = await Promise.all(
        normalizedPatients.map(async (patient: Patient) => {
          try {
            // Get patient appointments using appointmentService
            const appointments = await appointmentService.getPatientAppointments(patient.id);
            
            // Store appointments for future reference
            setPatientAppointments(prev => ({
              ...prev,
              [patient.id]: appointments
            }));
            
            // Find upcoming appointment
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const futureAppointments = appointments
              .filter((apt: Appointment) => 
                new Date(apt.date) >= today && 
                (apt.status === 'scheduled' || apt.status === 'confirmed')
              )
              .sort((a: Appointment, b: Appointment) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
              );
            
            // Find last visit
            const pastAppointments = appointments
              .filter((apt: Appointment) => 
                new Date(apt.date) < today && apt.status === 'completed'
              )
              .sort((a: Appointment, b: Appointment) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
            
            return {
              ...patient,
              upcomingAppointment: futureAppointments.length > 0 ? futureAppointments[0].date : null,
              lastVisit: pastAppointments.length > 0 ? pastAppointments[0].date : null
            };
          } catch (error) {
            console.error(`Error processing patient ${patient.id}:`, error);
            return {
              ...patient,
              upcomingAppointment: null,
              lastVisit: null
            };
          }
        })
      );
      
      setPatients(enhancedPatients);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      setError('Failed to load patients. Please pull down to refresh or try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPatients();
  };
  
  const applyFilters = () => {
    let result = [...patients];
    
    // Apply status filter
    if (selectedFilter !== 'all') {
      result = result.filter(patient => patient.status === selectedFilter);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(patient => 
        patient.name.toLowerCase().includes(query) ||
        (patient.email && patient.email.toLowerCase().includes(query)) ||
        (patient.phone && patient.phone.includes(query))
      );
    }
    
    setFilteredPatients(result);
  };
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };
  
  const applyFilter = (filter: string) => {
    setSelectedFilter(filter);
    setFilterModalVisible(false);
  };
  
  const navigateToPatientDetails = (patientId: string, patientName: string) => {
    navigation.navigate('StaffPatientDetails', { patientId, patientName });
  };
  
  const handleAddNewPatient = () => {
    navigation.navigate('AddPatient');
  };
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'None';
    
    try {
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigateToPatientDetails(item.id, item.name)}
      activeOpacity={0.7}
    >
      <View style={styles.patientCardHeader}>
        <Text style={styles.patientName}>{item.name}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: item.status === 'active' ? '#28a745' : '#6c757d' }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.patientInfoRow}>
        <Ionicons name="person" size={16} color="#6c757d" />
        <Text style={styles.patientInfoText}>
          {item.age ? `${item.age} years` : 'Age not provided'}, {item.gender || 'Gender not provided'}
        </Text>
      </View>
      
      <View style={styles.patientInfoRow}>
        <Ionicons name="mail" size={16} color="#6c757d" />
        <Text style={styles.patientInfoText}>{item.email || 'Email not provided'}</Text>
      </View>
      
      <View style={styles.patientInfoRow}>
        <Ionicons name="call" size={16} color="#6c757d" />
        <Text style={styles.patientInfoText}>{item.phone || 'Phone not provided'}</Text>
      </View>
      
      <View style={styles.appointmentInfo}>
        <View style={styles.appointmentInfoItem}>
          <Text style={styles.appointmentInfoLabel}>Next Visit:</Text>
          <Text style={styles.appointmentInfoValue}>{formatDate(item.upcomingAppointment)}</Text>
        </View>
        
        <View style={styles.appointmentInfoItem}>
          <Text style={styles.appointmentInfoLabel}>Last Visit:</Text>
          <Text style={styles.appointmentInfoValue}>{formatDate(item.lastVisit)}</Text>
        </View>
      </View>
      
      <View style={styles.patientCardFooter}>
        <Ionicons name="chevron-forward" size={18} color="#007bff" />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading patients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Patients</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewPatient}
        >
          <Ionicons name="add" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
      
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.filterButton,
            selectedFilter !== 'all' && styles.activeFilterButton
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons 
            name="filter" 
            size={20} 
            color={selectedFilter !== 'all' ? '#fff' : '#007bff'} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        renderItem={renderPatientItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.patientList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.errorState}>
              <Ionicons name="alert-circle-outline" size={60} color="#dc3545" />
              <Text style={styles.errorStateText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRefresh}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={60} color="#ddd" />
              <Text style={styles.emptyStateText}>No patients found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery || selectedFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Add patients to get started'}
              </Text>
              {!searchQuery && selectedFilter === 'all' && (
                <TouchableOpacity 
                  style={styles.addPatientButton}
                  onPress={handleAddNewPatient}
                >
                  <Text style={styles.addPatientButtonText}>Add New Patient</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
      
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
              <Text style={styles.modalTitle}>Filter Patients</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedFilter === 'all' && styles.selectedFilterOption
              ]}
              onPress={() => applyFilter('all')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'all' && styles.selectedFilterOptionText
              ]}>All Patients</Text>
              {selectedFilter === 'all' && (
                <Ionicons name="checkmark" size={20} color="#007bff" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedFilter === 'active' && styles.selectedFilterOption
              ]}
              onPress={() => applyFilter('active')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'active' && styles.selectedFilterOptionText
              ]}>Active Patients</Text>
              {selectedFilter === 'active' && (
                <Ionicons name="checkmark" size={20} color="#007bff" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedFilter === 'inactive' && styles.selectedFilterOption
              ]}
              onPress={() => applyFilter('inactive')}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === 'inactive' && styles.selectedFilterOptionText
              ]}>Inactive Patients</Text>
              {selectedFilter === 'inactive' && (
                <Ionicons name="checkmark" size={20} color="#007bff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#555',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
  },
  patientList: {
    padding: 12,
    paddingBottom: 80, // Extra space at the bottom
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
  appointmentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  appointmentInfoItem: {
    flex: 1,
  },
  appointmentInfoLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
  },
  appointmentInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  patientCardFooter: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addPatientButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  addPatientButtonText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorStateText: {
    fontSize: 16,
    color: '#dc3545',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#dc3545',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
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
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedFilterOption: {
    backgroundColor: '#f0f7ff',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFilterOptionText: {
    fontWeight: 'bold',
    color: '#007bff',
  },
});

export default StaffManagePatientsScreen;
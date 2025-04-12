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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { patientService, appointmentService } from '../../services/api';

// Define interfaces for our data structures
interface Patient {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  status: 'active' | 'inactive';
  medicalConditions?: string[];
  upcomingAppointment?: string | null;
  lastVisit?: string | null;
}

interface Appointment {
  id: string;
  date: string;
  patientId: string;
  doctorId: string;
  status: string;
}

// Define the navigation type
type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
}

const StaffManagePatientsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);

  // Fetch patients from API when the component mounts
  useEffect(() => {
    fetchPatients();
  }, []);

  // Apply filters when search query, selected filter, or patients list changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedFilter, patients]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // Fetch patients from the API
      const patientsData = await patientService.getAllPatients();
      
      // Enhance patient data with appointment information
      const enhancedPatients = await Promise.all(
        patientsData.map(async (patient: any) => {
          try {
            // Get upcoming appointments for this patient
            const appointments = await patientService.getPatientAppointments(patient.id);
            
            // Sort appointments by date/time and find the upcoming one
            const upcomingAppointment = appointments
              .filter((apt: Appointment) => new Date(apt.date) >= new Date())
              .sort((a: Appointment, b: Appointment) => 
                new Date(a.date).getTime() - new Date(b.date).getTime())[0];
              
            // Find the most recent past appointment for "last visit"
            const pastAppointments = appointments
              .filter((apt: Appointment) => new Date(apt.date) < new Date())
              .sort((a: Appointment, b: Appointment) => 
                new Date(b.date).getTime() - new Date(a.date).getTime());
            
            return {
              ...patient,
              upcomingAppointment: upcomingAppointment ? upcomingAppointment.date : null,
              lastVisit: pastAppointments.length > 0 ? pastAppointments[0].date : null
            };
          } catch (error) {
            console.error(`Error getting appointments for patient ${patient.id}:`, error);
            return patient;
          }
        })
      );
      
      setPatients(enhancedPatients);
    } catch (error) {
      console.error('Failed to load patients:', error);
      Alert.alert('Error', 'Failed to load patients. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...patients];
    
    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(patient => {
        return patient.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    
    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(patient => {
        switch(selectedFilter) {
          case 'active':
            return patient.status === 'active';
          case 'inactive':
            return patient.status === 'inactive';
          case 'withAppointment':
            return patient.upcomingAppointment !== null;
          default:
            return true;
        }
      });
    }
    
    setFilteredPatients(filtered);
  };

  const handlePatientPress = (patient: Patient) => {
    navigation.navigate('PatientDetails', { 
      patientId: patient.id,
      patientName: patient.name
    });
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleFilterSelect = (filter: string) => {
    setSelectedFilter(filter);
    setFilterModalVisible(false);
  };

  const handleAddNewPatient = () => {
    navigation.navigate('AddPatient');
  };
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString;
    }
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => handlePatientPress(item)}
    >
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <View style={styles.patientDetails}>
          <Text style={styles.detailText}>
            Age: {item.age || 'N/A'} • {item.gender || 'N/A'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot, 
              item.status === 'active' ? styles.activeStatus : styles.inactiveStatus
            ]} />
            <Text style={styles.statusText}>
              {item.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentInfo}>
          {item.upcomingAppointment ? (
            <View style={styles.appointmentChip}>
              <Ionicons name="calendar-outline" size={14} color="#007bff" />
              <Text style={styles.appointmentText}>
                Upcoming: {formatDate(item.upcomingAppointment)}
              </Text>
            </View>
          ) : (
            <View style={styles.noAppointmentChip}>
              <Ionicons name="calendar-outline" size={14} color="#6c757d" />
              <Text style={styles.noAppointmentText}>No upcoming appointments</Text>
            </View>
          )}
          
          <Text style={styles.lastVisitText}>
            Last visit: {formatDate(item.lastVisit)}
          </Text>
        </View>
        
        {item.medicalConditions && item.medicalConditions.length > 0 && (
          <View style={styles.conditionsContainer}>
            <Text style={styles.conditionsLabel}>Conditions: </Text>
            <Text style={styles.conditionsText}>
              {Array.isArray(item.medicalConditions) 
                ? item.medicalConditions.join(', ') 
                : item.medicalConditions}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patients</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewPatient}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={24} color="#007bff" />
          {selectedFilter !== 'all' && (
            <View style={styles.filterActiveDot} />
          )}
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : filteredPatients.length > 0 ? (
        <FlatList
          data={filteredPatients}
          renderItem={renderPatientItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={60} color="#ccc" />
          <Text style={styles.emptyStateText}>No patients found</Text>
          <Text style={styles.emptyStateSubtext}>
            Try adjusting your search or filter
          </Text>
        </View>
      )}
      
      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Filter Patients</Text>
              
              <TouchableOpacity 
                style={[
                  styles.filterOption,
                  selectedFilter === 'all' && styles.selectedFilterOption
                ]}
                onPress={() => handleFilterSelect('all')}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedFilter === 'all' && styles.selectedFilterText
                ]}>
                  All Patients
                </Text>
                {selectedFilter === 'all' && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterOption,
                  selectedFilter === 'active' && styles.selectedFilterOption
                ]}
                onPress={() => handleFilterSelect('active')}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedFilter === 'active' && styles.selectedFilterText
                ]}>
                  Active Patients
                </Text>
                {selectedFilter === 'active' && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterOption,
                  selectedFilter === 'inactive' && styles.selectedFilterOption
                ]}
                onPress={() => handleFilterSelect('inactive')}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedFilter === 'inactive' && styles.selectedFilterText
                ]}>
                  Inactive Patients
                </Text>
                {selectedFilter === 'inactive' && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.filterOption,
                  selectedFilter === 'withAppointment' && styles.selectedFilterOption
                ]}
                onPress={() => handleFilterSelect('withAppointment')}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedFilter === 'withAppointment' && styles.selectedFilterText
                ]}>
                  With Upcoming Appointment
                </Text>
                {selectedFilter === 'withAppointment' && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
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
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc3545',
  },
  listContent: {
    padding: 16,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  patientDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  activeStatus: {
    backgroundColor: '#28a745',
  },
  inactiveStatus: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  appointmentInfo: {
    marginTop: 8,
  },
  appointmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f3ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  appointmentText: {
    fontSize: 12,
    color: '#007bff',
    marginLeft: 4,
  },
  noAppointmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  noAppointmentText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  lastVisitText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  conditionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  conditionsLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: 'bold',
  },
  conditionsText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedFilterOption: {
    backgroundColor: '#007bff',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default StaffManagePatientsScreen;
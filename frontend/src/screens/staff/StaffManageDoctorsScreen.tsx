import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doctorService, staffService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Define interfaces
interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  image?: string;
  imageUrl?: string; // Added for backend compatibility
  rating?: string;
  patients?: string;
  isAvailable?: boolean;
  phoneNumber?: string;
  phone?: string; // Added for backend compatibility
  email?: string;
  workDays?: string;
  status: 'active' | 'inactive';
  registeredAt?: string;
  yearsExperience?: number;
  education?: string;
  languages?: string[];
  bio?: string;
  licenseNumber?: string;
}

interface Specialty {
  id: string;
  name: string;
}

interface FilterOptions {
  status: string;
  specialty: string;
}

type NavigationProp = NativeStackNavigationProp<any>;

const StaffManageDoctorsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([{ id: 'all', name: 'All' }]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Fetch doctors from API when component mounts
  useEffect(() => {
    fetchDoctors();
  }, []);
  
  // Update filtered doctors when filters or search query changes
  useEffect(() => {
    applyFilters();
  }, [doctors, searchQuery, selectedSpecialty, selectedStatus]);

  const fetchDoctors = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Use staffService instead of doctorService to get all doctors 
      const doctorsData = await staffService.getAllDoctors();
      
      // Transform data to handle different field names
      const normalizedDoctors = doctorsData.map((doctor: any) => ({
        ...doctor,
        // Handle image field variations
        image: doctor.imageUrl || doctor.image || null,
        // Handle phone field variations
        phoneNumber: doctor.phone || doctor.phoneNumber || null,
        // Only keep active or inactive status
        status: doctor.status === 'active' ? 'active' : 'inactive',
      }));
      
      setDoctors(normalizedDoctors);
      
      // Extract unique specialties from the doctor data
      const uniqueSpecialties = new Set<string>();
      normalizedDoctors.forEach((doctor: Doctor) => {
        if (doctor.specialty) {
          uniqueSpecialties.add(doctor.specialty);
        }
      });
      
      // Convert to array of objects format required by ScrollableTabs
      const specialtiesArray: Specialty[] = [{ id: 'all', name: 'All' }];
      uniqueSpecialties.forEach((specialty: string) => {
        specialtiesArray.push({
          id: specialty.toLowerCase().replace(/\s+/g, ''),
          name: specialty
        });
      });
      
      setSpecialties(specialtiesArray);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      Alert.alert('Error', 'Failed to load doctors. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...doctors];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doctor => 
          doctor.name.toLowerCase().includes(query) || 
          (doctor.specialty && doctor.specialty.toLowerCase().includes(query)) ||
          (doctor.email && doctor.email.toLowerCase().includes(query))
      );
    }
    
    // Apply specialty filter
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(
        doctor => doctor.specialty && doctor.specialty.toLowerCase().replace(/\s+/g, '') === selectedSpecialty
      );
    }
    
    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(doctor => doctor.status === selectedStatus);
    }
    
    setFilteredDoctors(filtered);
  };

  const navigateToDoctorDetails = (doctorId: string, doctorName: string): void => {
    navigation.navigate('DoctorDetails', { doctorId, doctorName });
  };

  const handleAddDoctor = (): void => {
    // Since there's no AddDoctor screen yet, show an alert instead
    Alert.alert(
      "Feature Not Available",
      "The add doctor feature is coming soon.",
      [{ text: "OK" }]
    );
    // When the screen is created, uncomment this line:
    // navigation.navigate('AddDoctor');
  };

  const handleSearch = (text: string): void => {
    setSearchQuery(text);
  };

  const handleSpecialtyFilter = (specialtyId: string): void => {
    setSelectedSpecialty(specialtyId);
  };

  const handleStatusFilter = (status: string): void => {
    setSelectedStatus(status);
    setFilterModalVisible(false);
  };

  const handleUpdateDoctorStatus = async (doctor: Doctor, newStatus: 'active' | 'inactive'): Promise<void> => {
    if (!user) return;
    
    Alert.alert(
      newStatus === 'active' ? 'Activate Doctor' : 'Deactivate Doctor',
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} Dr. ${doctor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'active' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              let reason = '';
              if (newStatus === 'inactive') {
                // You could add a prompt here for a reason if needed
                reason = 'Deactivated by staff';
              }
              
              await staffService.updateDoctorStatus(
                doctor.id,
                newStatus,
                user.id,
                reason
              );
              
              // Update local state
              const updatedDoctors = doctors.map(doc => {
                if (doc.id === doctor.id) {
                  return { ...doc, status: newStatus };
                }
                return doc;
              });
              
              setDoctors(updatedDoctors);
              
              Alert.alert('Success', `Doctor status updated to ${newStatus}`);
            } catch (error) {
              console.error('Failed to update doctor status:', error);
              Alert.alert('Error', 'Failed to update doctor status. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Render doctor status badge
  const renderStatusBadge = (status: string) => {
    let color = '';
    let label = '';
    
    switch (status) {
      case 'active':
        color = '#28a745'; // Success green
        label = 'Active';
        break;
      case 'inactive':
        color = '#6c757d'; // Secondary gray
        label = 'Inactive';
        break;
      default:
        color = '#6c757d'; // Default gray
        label = status.charAt(0).toUpperCase() + status.slice(1);
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: color }]}>
        <Text style={styles.statusText}>{label}</Text>
      </View>
    );
  };

  // Render action buttons based on doctor status
  const renderActionButtons = (doctor: Doctor) => {
    switch (doctor.status) {
      case 'active':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => navigateToDoctorDetails(doctor.id, doctor.name)}
            >
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deactivateButton]}
              onPress={() => handleUpdateDoctorStatus(doctor, 'inactive')}
            >
              <Ionicons name="power" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Deactivate</Text>
            </TouchableOpacity>
          </View>
        );
      case 'inactive':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => navigateToDoctorDetails(doctor.id, doctor.name)}
            >
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.activateButton]}
              onPress={() => handleUpdateDoctorStatus(doctor, 'active')}
            >
              <Ionicons name="power" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Activate</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => navigateToDoctorDetails(doctor.id, doctor.name)}
            >
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with title */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Manage Doctors</Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#adb5bd"
          />
          <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Specialty tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {specialties.map((specialty) => (
          <TouchableOpacity
            key={specialty.id}
            style={[
              styles.tab,
              selectedSpecialty === specialty.id && styles.activeTab
            ]}
            onPress={() => handleSpecialtyFilter(specialty.id)}
          >
            <Text
              style={[
                styles.tabText,
                selectedSpecialty === specialty.id && styles.activeTabText
              ]}
            >
              {specialty.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Doctors List */}
      <FlatList
        data={filteredDoctors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.doctorCard}>
            <View style={styles.doctorCardHeader}>
              <View style={styles.doctorInfo}>
                <Image
                  source={
                    item.image
                      ? { uri: item.image }
                      : require('../../../assets/default-avatar.png')
                  }
                  style={styles.doctorImage}
                />
                <View>
                  <Text style={styles.doctorName}>{item.name}</Text>
                  <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
                </View>
              </View>
              {renderStatusBadge(item.status)}
            </View>
            
            <View style={styles.doctorDetails}>
              {item.email && (
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={16} color="#6c757d" />
                  <Text style={styles.detailText}>{item.email}</Text>
                </View>
              )}
              {item.phoneNumber && (
                <View style={styles.detailItem}>
                  <Ionicons name="call-outline" size={16} color="#6c757d" />
                  <Text style={styles.detailText}>{item.phoneNumber}</Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            {renderActionButtons(item)}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="medkit-outline" size={60} color="#dee2e6" />
            <Text style={styles.emptyStateText}>No doctors found</Text>
            <Text style={styles.emptyStateSubText}>
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Add a doctor to get started"}
            </Text>
          </View>
        }
      />

      {/* Add Doctor Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddDoctor}>
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
              <Text style={styles.modalTitle}>Filter Doctors</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.filterSectionTitle}>Status</Text>
            <View style={styles.filterOptions}>
              {['all', 'active', 'inactive'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    selectedStatus === status && styles.activeFilterOption
                  ]}
                  onPress={() => handleStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedStatus === status && styles.activeFilterOptionText
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Extra space for the FAB
  },
  doctorCard: {
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
  doctorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  doctorDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#495057',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  viewButton: {
    backgroundColor: '#007bff',
  },
  activateButton: {
    backgroundColor: '#28a745',
  },
  deactivateButton: {
    backgroundColor: '#f59f00',
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
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e9ecef',
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterOption: {
    backgroundColor: '#007bff',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#495057',
  },
  activeFilterOptionText: {
    color: '#fff',
  },
});

export default StaffManageDoctorsScreen;
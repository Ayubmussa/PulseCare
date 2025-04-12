import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Modal,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { doctorService } from '../../services/api';

// Define types for route params
type DoctorDetailsParams = {
  doctorId: string;
};

// Define Doctor interface
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  education?: string;
  yearsExperience?: number;
  bio?: string;
  schedule?: {
    day: string;
    hours: string;
  }[];
  rating?: number;
  reviewCount?: number;
  appointmentsToday?: number;
  totalPatients?: number;
  status: 'active' | 'inactive';
  specialties?: string[];
  languages?: string[];
  imageUrl?: string;
}

const StaffDoctorDetailsScreen = () => {
  const route = useRoute<RouteProp<Record<string, DoctorDetailsParams>, string>>();
  const navigation = useNavigation();
  const { doctorId } = route.params;
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  
  // Doctor data state
  const [doctor, setDoctor] = useState<Doctor>({
    id: doctorId,
    name: '',
    specialty: '',
    email: '',
    phone: '',
    status: 'active',
  });

  // Fetch doctor from API
  useEffect(() => {
    fetchDoctorDetails();
  }, [doctorId]);

  const fetchDoctorDetails = async () => {
    setLoading(true);
    try {
      // Get doctor data from API
      const doctorData = await doctorService.getDoctorById(doctorId);
      
      // Transform API data into UI model if needed
      const transformedData = {
        ...doctorData,
        // Map any fields that might have different names in the API
        imageUrl: doctorData.imageUrl || doctorData.image || 'https://via.placeholder.com/150',
        // Set default values for optional fields
        status: doctorData.status || 'active',
        specialties: doctorData.specialties || [doctorData.specialty],
        languages: doctorData.languages || ['English'],
        schedule: doctorData.schedule || [
          { day: 'Monday', hours: '9:00 AM - 5:00 PM' },
          { day: 'Tuesday', hours: '9:00 AM - 5:00 PM' },
          { day: 'Wednesday', hours: '10:00 AM - 6:00 PM' },
          { day: 'Thursday', hours: '9:00 AM - 5:00 PM' },
          { day: 'Friday', hours: '9:00 AM - 3:00 PM' },
        ]
      };
      
      setDoctor(transformedData);
    } catch (error) {
      console.error('Error fetching doctor details:', error);
      Alert.alert('Error', 'Failed to load doctor information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (field: string, value: string) => {
    setEditField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      // Create update object with just the field being edited
      const updateData = {
        [editField]: editValue
      };
      
      // Update doctor in API
      await doctorService.updateDoctor(doctor.id, updateData);
      
      // Update local state
      setDoctor({
        ...doctor,
        [editField]: editValue
      });
      
      setEditModalVisible(false);
      Alert.alert('Updated', `${editField.charAt(0).toUpperCase() + editField.slice(1)} has been updated successfully.`);
    } catch (error) {
      console.error('Failed to update doctor information:', error);
      Alert.alert('Error', 'Failed to update. Please try again later.');
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      // Update status in API
      await doctorService.updateDoctor(doctor.id, { 
        status: status as 'active' | 'inactive' 
      });
      
      // Update local state
      setDoctor({
        ...doctor,
        status: status as 'active' | 'inactive'
      });
      
      setStatusModalVisible(false);
      Alert.alert(
        'Status Updated', 
        `Doctor status has been changed to ${status.charAt(0).toUpperCase() + status.slice(1)}.`
      );
    } catch (error) {
      console.error('Failed to update doctor status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again later.');
    }
  };

  const handleViewSchedule = () => {
    // Navigate to doctor schedule screen or show detailed schedule
    console.log('View detailed schedule');
  };
  
  const handleViewPatients = () => {
    // Navigate to doctor's patients list
    console.log('View doctor patients');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image 
            source={{ uri: doctor.imageUrl }} 
            style={styles.doctorImage} 
          />
          <View style={styles.doctorMainInfo}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{doctor.rating}</Text>
              <Text style={styles.reviewCount}>({doctor.reviewCount} reviews)</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusSection}>
          <TouchableOpacity 
            style={[
              styles.statusBadge, 
              doctor.status === 'active' ? styles.activeStatus : styles.inactiveStatus
            ]}
            onPress={() => setStatusModalVisible(true)}
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {doctor.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={doctor.status === 'active' ? '#28a745' : '#dc3545'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{doctor.appointmentsToday}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{doctor.totalPatients}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditField('email', doctor.email)}
          >
            <Ionicons name="create-outline" size={18} color="#007bff" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="mail-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{doctor.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="call-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{doctor.phone}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="card-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>License: {doctor.licenseNumber}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Specialties & Languages</Text>
        </View>
        
        <View style={styles.chipContainer}>
          {doctor.specialties?.map((specialty, index) => (
            <View key={index} style={styles.chip}>
              <Text style={styles.chipText}>{specialty}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="language-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{doctor.languages?.join(', ')}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Professional Background</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditField('bio', doctor.bio || '')}
          >
            <Ionicons name="create-outline" size={18} color="#007bff" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="school-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{doctor.education}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="briefcase-outline" size={20} color="#007bff" />
          </View>
          <Text style={styles.infoText}>{doctor.yearsExperience} years of experience</Text>
        </View>
        
        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>{doctor.bio}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Schedule Overview</Text>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={handleViewSchedule}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
        
        {doctor.schedule?.map((scheduleItem, index) => (
          <View key={index} style={styles.scheduleRow}>
            <Text style={styles.scheduleDay}>{scheduleItem.day}</Text>
            <Text style={styles.scheduleHours}>{scheduleItem.hours}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleViewPatients}
        >
          <Ionicons name="people-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>View Patients</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.scheduleButton]}
          onPress={handleViewSchedule}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Manage Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Field Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editField === 'email' ? 'Email' : 
                    editField === 'bio' ? 'Bio' : editField}
            </Text>
            
            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, editField === 'bio' && styles.multilineInput]}
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
                multiline={editField === 'bio'}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.statusModalContent}>
            <Text style={styles.modalTitle}>Change Doctor Status</Text>
            
            <TouchableOpacity 
              style={styles.statusOption}
              onPress={() => handleStatusChange('active')}
            >
              <View style={[styles.statusDot, styles.activeStatusDot]} />
              <Text style={styles.statusOptionText}>Active</Text>
              {doctor.status === 'active' && (
                <Ionicons name="checkmark" size={20} color="#28a745" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statusOption}
              onPress={() => handleStatusChange('inactive')}
            >
              <View style={[styles.statusDot, styles.inactiveStatusDot]} />
              <Text style={styles.statusOptionText}>Inactive</Text>
              {doctor.status === 'inactive' && (
                <Ionicons name="checkmark" size={20} color="#dc3545" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelStatusButton}
              onPress={() => setStatusModalVisible(false)}
            >
              <Text style={styles.cancelStatusText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  doctorMainInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorSpecialty: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#777',
    marginLeft: 4,
  },
  statusSection: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeStatus: {
    backgroundColor: '#e6f7e6',
    borderColor: '#c3e6cb',
  },
  inactiveStatus: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  activeStatusDot: {
    backgroundColor: '#28a745',
  },
  inactiveStatusDot: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  viewButtonText: {
    color: '#007bff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#f0f9ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  chipText: {
    color: '#007bff',
    fontSize: 13,
  },
  bioContainer: {
    marginTop: 10,
  },
  bioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  scheduleHours: {
    fontSize: 15,
    color: '#666',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  scheduleButton: {
    backgroundColor: '#6c757d',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  statusModalContent: {
    width: '75%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalInputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 20,
  },
  modalInput: {
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  cancelStatusButton: {
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 10,
  },
  cancelStatusText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default StaffDoctorDetailsScreen;
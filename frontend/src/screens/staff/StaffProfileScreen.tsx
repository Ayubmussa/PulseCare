import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { staffService } from '../../services/api';

interface StaffInfo {
  id: string;
  name: string;
  role: string;
  email: string;
  phoneNumber: string;
  employeeId: string;
  department: string;
  joinDate: string;
  workHours: string;
  supervisor: string;
  image?: string;
  status?: string;
}

const StaffProfileScreen = () => {
  const { user, logout } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp<any>>();
  

  const [staffInfo, setStaffInfo] = useState<StaffInfo>({
    id: '',
    name: '',
    role: '',
    email: '',
    phoneNumber: '',
    employeeId: '',
    department: '',
    joinDate: '',
    workHours: '',
    supervisor: '',
    status: 'active'
  });

  useEffect(() => {
    fetchStaffProfile();
  }, []);

  const fetchStaffProfile = async () => {
    if (!user || !user.id) {
      setError('User information not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const profileData = await staffService.getStaffById(user.id);
      
      // Transform API data to the format needed by the UI
      setStaffInfo({
        id: profileData.id,
        name: profileData.name || 'N/A',
        role: profileData.role || 'Staff Member',
        email: profileData.email || 'N/A',
        phoneNumber: profileData.phoneNumber || profileData.phone || 'N/A',
        employeeId: profileData.employeeId || profileData.employee_id || `STAFF-${profileData.id.substring(0, 4)}`,
        department: profileData.department || 'General',
        joinDate: formatDate(profileData.joinDate || profileData.join_date || profileData.createdAt || profileData.created_at),
        workHours: profileData.workHours || profileData.work_hours || 'Mon-Fri, 9:00 AM - 5:00 PM',
        supervisor: profileData.supervisor || 'N/A',
        image: profileData.image || profileData.profile_image,
        status: profileData.status || 'active'
      });
    } catch (err) {
      console.error('Failed to fetch staff profile:', err);
      setError('Failed to load profile data. Please try again.');
      Alert.alert(
        'Error Loading Profile',
        'We were unable to load your profile information. Please check your connection and try again.',
        [
          { text: 'OK' },
          { 
            text: 'Retry', 
            onPress: () => fetchStaffProfile() 
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleEditField = (field: string, value: string) => {
    setEditField(field);
    setEditValue(value);
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!user || !user.id) {
      Alert.alert('Error', 'User information not available');
      setModalVisible(false);
      return;
    }

    try {
      setSaving(true);
      
      // Update the field in the backend
      const updateData = { [editField]: editValue };
      await staffService.updateStaff(user.id, updateData);
      
      // Update local state
      setStaffInfo({
        ...staffInfo,
        [editField]: editValue
      });
      
      setModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      console.error('Failed to update profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigation.navigate('Login');
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {saving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      
      <View style={styles.header}>
        <Image 
          source={staffInfo.image ? { uri: staffInfo.image } : require('../../../assets/default-avatar.png')} 
          style={styles.profileImage}
          onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
        />
        <Text style={styles.name}>{staffInfo.name}</Text>
        <Text style={styles.role}>{staffInfo.role}</Text>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: staffInfo.status === 'active' ? '#e6f7e6' : '#f8d7da' }
        ]}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: staffInfo.status === 'active' ? '#28a745' : '#dc3545' }
          ]} />
          <Text style={[
            styles.statusText,
            { color: staffInfo.status === 'active' ? '#28a745' : '#dc3545' }
          ]}>
            {staffInfo.status === 'active' ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="mail-outline" size={24} color="#007bff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{staffInfo.email}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditField('email', staffInfo.email)}
          >
            <Ionicons name="create-outline" size={20} color="#007bff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="call-outline" size={24} color="#007bff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{staffInfo.phoneNumber}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditField('phoneNumber', staffInfo.phoneNumber)}
          >
            <Ionicons name="create-outline" size={20} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employment Details</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="card-outline" size={24} color="#007bff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>{staffInfo.employeeId}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="business-outline" size={24} color="#007bff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{staffInfo.department}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="calendar-outline" size={24} color="#007bff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Join Date</Text>
            <Text style={styles.infoValue}>{staffInfo.joinDate}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="time-outline" size={24} color="#007bff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Work Hours</Text>
            <Text style={styles.infoValue}>{staffInfo.workHours}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditField('workHours', staffInfo.workHours)}
          >
            <Ionicons name="create-outline" size={20} color="#007bff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="person-outline" size={24} color="#007bff" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Supervisor</Text>
            <Text style={styles.infoValue}>{staffInfo.supervisor}</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => Alert.alert('Coming Soon', 'Account settings will be available in the next update.')}
      >
        <Ionicons name="settings-outline" size={24} color="#007bff" />
        <Text style={styles.settingsText}>Account Settings</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      
      {/* Edit Field Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editField === 'email' ? 'Email' : 
                     editField === 'phoneNumber' ? 'Phone Number' : 
                     editField === 'workHours' ? 'Work Hours' : editField}
            </Text>
            
            <TextInput
              style={styles.input}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              keyboardType={editField === 'email' ? 'email-address' : 
                            editField === 'phoneNumber' ? 'phone-pad' : 'default'}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007bff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 10,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    marginRight: 6,
  },
  statusText: {
    color: '#28a745',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  settingsText: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
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
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
});

export default StaffProfileScreen;
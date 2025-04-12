import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Modal,
  TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StaffProfileScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');

  const [staffInfo, setStaffInfo] = useState({
    name: 'Sarah Johnson',
    role: 'Clinic Administrator',
    email: 'sarah.johnson@pulsecare.com',
    phoneNumber: '+1 (555) 123-4567',
    employeeId: 'STAFF-1234',
    department: 'Administration',
    joinDate: 'Jan 15, 2023',
    workHours: 'Mon-Fri, 9:00 AM - 5:00 PM',
    supervisor: 'Dr. James Wilson, Medical Director',
  });

  const handleEditField = (field: string, value: string) => {
    setEditField(field);
    setEditValue(value);
    setModalVisible(true);
  };

  const handleSaveEdit = () => {
    setStaffInfo({
      ...staffInfo,
      [editField]: editValue
    });
    setModalVisible(false);
  };

  const handleLogout = () => {
    // Implement logout functionality
    console.log('Logging out...');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: 'https://via.placeholder.com/150' }} 
          style={styles.profileImage} 
        />
        <Text style={styles.name}>{staffInfo.name}</Text>
        <Text style={styles.role}>{staffInfo.role}</Text>
        
        <View style={styles.statusBadge}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>Active</Text>
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
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
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
});

export default StaffProfileScreen;
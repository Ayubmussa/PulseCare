import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { clinicService, staffService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Define TypeScript interfaces for data structures
interface OperatingHour {
  day: string;
  hours: string;
  isOpen: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  image: string;
}

interface Service {
  id: string;
  name: string;
  price: string;
}

const StaffClinicInfoScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Clinic details state
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicWebsite, setClinicWebsite] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Operating hours state
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([]);
  
  // Staff members state
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  
  // Services state
  const [services, setServices] = useState<Service[]>([]);

  // Fetch clinic data from API
  useEffect(() => {
    fetchClinicData();
  }, []);

  const fetchClinicData = async () => {
    setLoading(true);
    setError('');
    try {
      // Get clinic info - use staff-specific endpoint for proper authorization
      let clinicData;
      try {
        // First attempt to use staff-specific endpoint
        clinicData = await staffService.getClinicInfo();
      } catch (staffError) {
        console.warn("Staff clinic endpoint failed, falling back to general endpoint:", staffError);
        // Fallback to general endpoint if staff-specific one fails
        clinicData = await clinicService.getClinicInfo();
      }
      
      setClinicName(clinicData.name);
      setClinicAddress(clinicData.address);
      setClinicPhone(clinicData.phone);
      setClinicEmail(clinicData.email);
      setClinicWebsite(clinicData.website);
      setOperatingHours(clinicData.operatingHours);
      
      // Get staff members - use staff-specific endpoint when available
      let staffData;
      try {
        staffData = await staffService.getAllStaff();
      } catch (staffError) {
        console.warn("Staff members endpoint failed, falling back to general endpoint:", staffError);
        staffData = await clinicService.getStaffMembers();
      }
      setStaffMembers(staffData);
      
      // Get services - directly use the clinicService since staffService doesn't have this method
      try {
        const servicesData = await clinicService.getServices();
        setServices(servicesData);
      } catch (servicesError) {
        console.warn("Services endpoint failed:", servicesError);
        // Load fallback data if services can't be fetched
        setServices([
          { id: 'srv1', name: 'General Consultation', price: '$75' },
          { id: 'srv2', name: 'Specialist Consultation', price: '$150' },
          { id: 'srv3', name: 'Blood Test', price: '$50' }
        ]);
      }
      
    } catch (err) {
      console.error("Error fetching clinic data:", err);
      setError('Failed to load clinic information. Please try again later.');
      
      // Load fallback data for development
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    // Fallback data when API fails (for development purposes)
    setClinicName('PulseCare Medical Center');
    setClinicAddress('123 Healthcare Avenue, Medical District, CA 90210');
    setClinicPhone('(555) 123-4567');
    setClinicEmail('contact@pulsecare.med');
    setClinicWebsite('www.pulsecare.med');
    
    setOperatingHours([
      { day: 'Monday', hours: '8:00 AM - 6:00 PM', isOpen: true },
      { day: 'Tuesday', hours: '8:00 AM - 6:00 PM', isOpen: true },
      { day: 'Wednesday', hours: '8:00 AM - 6:00 PM', isOpen: true },
      { day: 'Thursday', hours: '8:00 AM - 6:00 PM', isOpen: true },
      { day: 'Friday', hours: '8:00 AM - 5:00 PM', isOpen: true },
      { day: 'Saturday', hours: '9:00 AM - 2:00 PM', isOpen: true },
      { day: 'Sunday', hours: 'Closed', isOpen: false },
    ]);
    
    setStaffMembers([
      { id: 's1', name: 'Sarah Thompson', role: 'Receptionist', image: 'https://via.placeholder.com/150' },
      { id: 's2', name: 'Mark Johnson', role: 'Office Manager', image: 'https://via.placeholder.com/150' },
      { id: 's3', name: 'Linda Chen', role: 'Nurse Assistant', image: 'https://via.placeholder.com/150' },
      { id: 's4', name: 'David Wilson', role: 'IT Support', image: 'https://via.placeholder.com/150' },
    ]);
    
    setServices([
      { id: 'srv1', name: 'General Consultation', price: '$75' },
      { id: 'srv2', name: 'Specialist Consultation', price: '$150' },
      { id: 'srv3', name: 'Blood Test', price: '$50' },
      { id: 'srv4', name: 'X-Ray', price: '$120' },
      { id: 'srv5', name: 'Ultrasound', price: '$200' },
      { id: 'srv6', name: 'Vaccination', price: '$45' },
    ]);
  };

  const toggleEditing = async () => {
    if (isEditing) {
      try {
        setSaving(true);
        
        // Save clinic information using staff-specific endpoint when available
        try {
          await staffService.updateClinicInfo({
            name: clinicName,
            address: clinicAddress,
            phone: clinicPhone,
            email: clinicEmail,
            website: clinicWebsite
          });
        } catch (error) {
          console.warn("Staff clinic update endpoint failed, falling back to general endpoint:", error);
          await clinicService.updateClinicInfo({
            name: clinicName,
            address: clinicAddress,
            phone: clinicPhone,
            email: clinicEmail,
            website: clinicWebsite
          });
        }
        
        // Save operating hours directly using clinicService since staffService doesn't have this method
        await clinicService.updateOperatingHours(operatingHours);
        
        Alert.alert(
          'Changes Saved',
          'Clinic information has been updated successfully.',
          [{ text: 'OK' }]
        );
      } catch (err) {
        console.error("Error saving clinic data:", err);
        Alert.alert(
          'Error',
          'Failed to save changes. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setSaving(false);
      }
    }
    setIsEditing(!isEditing);
  };

  const updateOperatingHours = (index: number, field: keyof OperatingHour, value: string | boolean) => {
    const updatedHours = [...operatingHours];
    updatedHours[index] = {
      ...updatedHours[index],
      [field]: value
    };
    setOperatingHours(updatedHours);
  };

  const addStaffMember = () => {
    Alert.alert('Feature Coming Soon', 'Staff member management will be available in the next update.');
  };

  const updateService = (id: string, field: keyof Service, value: string) => {
    const updatedServices = services.map(service => {
      if (service.id === id) {
        return { ...service, [field]: value };
      }
      return service;
    });
    setServices(updatedServices);
  };

  const saveService = async (id: string) => {
    if (!isEditing) return;
    
    try {
      setSaving(true);
      const service = services.find(s => s.id === id);
      if (!service) return;
      
      // Use clinicService directly since staffService.updateService doesn't exist
      await clinicService.updateService(id, service);
      
      Alert.alert('Success', 'Service updated successfully');
    } catch (err) {
      console.error("Error updating service:", err);
      Alert.alert('Error', 'Failed to update service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addService = async () => {
    if (!isEditing) return;
    
    try {
      setSaving(true);
      const newService = {
        name: 'New Service',
        price: '$0'
      };
      
      // Use clinicService directly since staffService.addService doesn't exist
      const addedService = await clinicService.addService(newService);
      
      setServices([...services, addedService]);
      Alert.alert('Success', 'Service added successfully. You can now edit its details.');
    } catch (err) {
      console.error("Error adding service:", err);
      Alert.alert('Error', 'Failed to add new service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!isEditing) return;
    
    try {
      setSaving(true);
      
      // Use clinicService directly since staffService.deleteService doesn't exist
      await clinicService.deleteService(id);
      
      setServices(services.filter(service => service.id !== id));
      Alert.alert('Success', 'Service deleted successfully');
    } catch (err) {
      console.error("Error deleting service:", err);
      Alert.alert('Error', 'Failed to delete service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderClinicDetails = () => (
    <View style={styles.sectionContent}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Clinic Name</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={clinicName}
            onChangeText={setClinicName}
            placeholder="Clinic Name"
          />
        ) : (
          <Text style={styles.detailText}>{clinicName}</Text>
        )}
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Address</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={clinicAddress}
            onChangeText={setClinicAddress}
            placeholder="Clinic Address"
            multiline
          />
        ) : (
          <Text style={styles.detailText}>{clinicAddress}</Text>
        )}
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={clinicPhone}
            onChangeText={setClinicPhone}
            placeholder="Clinic Phone"
            keyboardType="phone-pad"
          />
        ) : (
          <Text style={styles.detailText}>{clinicPhone}</Text>
        )}
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={clinicEmail}
            onChangeText={setClinicEmail}
            placeholder="Clinic Email"
            keyboardType="email-address"
          />
        ) : (
          <Text style={styles.detailText}>{clinicEmail}</Text>
        )}
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Website</Text>
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={clinicWebsite}
            onChangeText={setClinicWebsite}
            placeholder="Clinic Website"
          />
        ) : (
          <Text style={styles.detailText}>{clinicWebsite}</Text>
        )}
      </View>
    </View>
  );

  const renderOperatingHours = () => (
    <View style={styles.sectionContent}>
      {operatingHours.map((item, index) => (
        <View key={item.day} style={styles.hoursRow}>
          <Text style={styles.dayText}>{item.day}</Text>
          
          {isEditing ? (
            <View style={styles.hoursEditContainer}>
              <TextInput
                style={[styles.hoursInput, !item.isOpen && styles.disabledInput]}
                value={item.hours}
                onChangeText={(text) => updateOperatingHours(index, 'hours', text)}
                editable={item.isOpen}
              />
              <Switch
                value={item.isOpen}
                onValueChange={(value) => {
                  updateOperatingHours(index, 'isOpen', value);
                  if (!value) updateOperatingHours(index, 'hours', 'Closed');
                  else if (item.hours === 'Closed') updateOperatingHours(index, 'hours', '9:00 AM - 5:00 PM');
                }}
                trackColor={{ false: '#d1d1d1', true: '#bde0fe' }}
                thumbColor={item.isOpen ? '#007bff' : '#f4f3f4'}
              />
            </View>
          ) : (
            <Text 
              style={[
                styles.hoursText, 
                !item.isOpen && styles.closedText
              ]}
            >
              {item.hours}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderStaffMembers = () => (
    <View style={styles.sectionContent}>
      {staffMembers.map((staff) => (
        <View key={staff.id} style={styles.staffCard}>
          <Image 
            source={{ uri: staff.image }} 
            style={styles.staffImage}
            onError={(e) => console.log('Image not found, using placeholder')}
          />
          <View style={styles.staffInfo}>
            <Text style={styles.staffName}>{staff.name}</Text>
            <Text style={styles.staffRole}>{staff.role}</Text>
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color="#007bff" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      
      {isEditing && (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={addStaffMember}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Add Staff Member</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderServices = () => (
    <View style={styles.sectionContent}>
      {services.map((service) => (
        <View key={service.id} style={styles.serviceRow}>
          <View style={styles.serviceInfo}>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={service.name}
                onChangeText={(text) => updateService(service.id, 'name', text)}
                onBlur={() => saveService(service.id)}
              />
            ) : (
              <Text style={styles.serviceName}>{service.name}</Text>
            )}
          </View>
          
          <View style={styles.priceContainer}>
            {isEditing ? (
              <TextInput
                style={[styles.textInput, styles.priceInput]}
                value={service.price}
                onChangeText={(text) => updateService(service.id, 'price', text)}
                onBlur={() => saveService(service.id)}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.priceText}>{service.price}</Text>
            )}
          </View>
          
          {isEditing && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteService(service.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      
      {isEditing && (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={addService}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && services.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading clinic information...</Text>
      </View>
    );
  }

  if (error && services.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchClinicData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overlay loading indicator when saving */}
      {saving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clinic Information</Text>
        <TouchableOpacity 
          style={[
            styles.editToggleButton, 
            isEditing ? styles.saveButton : styles.editButton
          ]}
          onPress={toggleEditing}
          disabled={saving}
        >
          <Ionicons 
            name={isEditing ? "checkmark" : "create-outline"} 
            size={20} 
            color={isEditing ? "white" : "#007bff"} 
          />
          <Text 
            style={[
              styles.editToggleText,
              isEditing ? styles.saveText : styles.editText
            ]}
          >
            {isEditing ? "Save Changes" : "Edit Info"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Clinic Details Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={22} color="#333" />
          <Text style={styles.sectionTitle}>Clinic Details</Text>
        </View>
        {renderClinicDetails()}
      </View>

      {/* Operating Hours Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={22} color="#333" />
          <Text style={styles.sectionTitle}>Operating Hours</Text>
        </View>
        {renderOperatingHours()}
      </View>

      {/* Staff Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={22} color="#333" />
          <Text style={styles.sectionTitle}>Staff Members</Text>
        </View>
        {renderStaffMembers()}
      </View>

      {/* Services Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="medkit-outline" size={22} color="#333" />
          <Text style={styles.sectionTitle}>Services & Pricing</Text>
        </View>
        {renderServices()}
      </View>

      {/* Additional Info */}
      <TouchableOpacity 
        style={styles.additionalButton}
        onPress={() => Alert.alert('Coming Soon', 'Additional settings will be available in the next update.')}
      >
        <Ionicons name="settings-outline" size={20} color="#007bff" />
        <Text style={styles.additionalButtonText}>Advanced Settings</Text>
        <Ionicons name="chevron-forward" size={16} color="#007bff" />
      </TouchableOpacity>

      {/* Bottom space */}
      <View style={styles.bottomSpace} />
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  editToggleText: {
    fontSize: 14,
    marginLeft: 4,
  },
  editText: {
    color: '#007bff',
  },
  saveText: {
    color: 'white',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  sectionContent: {
    paddingHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    width: 100,
  },
  hoursText: {
    fontSize: 16,
    color: '#333',
  },
  closedText: {
    color: '#dc3545',
  },
  hoursEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    marginRight: 10,
    width: 150,
    backgroundColor: '#f9f9f9',
  },
  disabledInput: {
    backgroundColor: '#e9e9e9',
    color: '#888',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  staffImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
  },
  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  staffRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    color: '#333',
  },
  priceContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  priceInput: {
    width: 80,
    textAlign: 'right',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  additionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  additionalButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#007bff',
    marginLeft: 8,
  },
  bottomSpace: {
    height: 20,
  }
});

export default StaffClinicInfoScreen;
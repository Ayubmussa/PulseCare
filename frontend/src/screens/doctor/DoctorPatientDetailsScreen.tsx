import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { patientService, appointmentService, medicalHistoryService } from '../../services/api';

interface RouteParams {
  id: string;
  patientId?: string; // Adding this as an alternative parameter
  patientName: string;
}

interface PatientDetails {
  id: string;
  name: string;
  age: number;
  gender: string;
  dateOfBirth: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  allergies: string[];
  conditions: string[];
  image?: string;
}

interface MedicalRecord {
  id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  doctorName: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  reason: string;
  doctorName: string;
  doctorId: string;
}

const DoctorPatientDetailsScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'records' | 'appointments'>('info');
  
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  // Use patientId if available, otherwise use id (for backward compatibility)
  const { id, patientId, patientName } = route.params as RouteParams;
  const actualPatientId = patientId || id;

  useEffect(() => {
    loadPatientData();
  }, [actualPatientId]);

  const loadPatientData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch patient details
      const details = await patientService.getPatientById(actualPatientId);
      setPatientDetails(details);
      
      // Fetch medical records
      const records = await medicalHistoryService.getAllMedicalHistory({ patient_id: actualPatientId });
      setMedicalRecords(records);
      
      // Fetch appointments
      const appts = await appointmentService.getAllAppointments();
      // Filter appointments for the current patient
      const filteredAppts = appts.filter((appointment: any) => appointment.patientId === actualPatientId);
      setAppointments(filteredAppts);
      
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPatientData();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric',
      month: 'long', 
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

  const navigateToMedicalRecord = (recordId: string) => {
    navigation.navigate('MedicalRecord', { id: recordId, patientId: actualPatientId, patientName });
  };

  const navigateToAppointmentDetails = (appointmentId: string) => {
    navigation.navigate('AppointmentDetails', { id: appointmentId });
  };

  const sendMessage = () => {
    navigation.navigate('ChatDetails', { patientId: actualPatientId, patientName });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={['#007bff']}
        />
      }
    >
      {/* Patient Profile Header */}
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: patientDetails?.image || 'https://via.placeholder.com/100' }}
          style={styles.profileImage}
        />
        <Text style={styles.patientName}>{patientDetails?.name}</Text>
        <View style={styles.profileInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={16} color="#6c757d" />
            <Text style={styles.infoText}>
              {patientDetails?.age} years, {patientDetails?.gender}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="water" size={16} color="#dc3545" />
            <Text style={styles.infoText}>
              Blood Type: {patientDetails?.bloodType || 'Unknown'}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={sendMessage}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#007bff" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigation.navigate('AppointmentBooking', { patientId: actualPatientId })}
          >
            <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryActionText}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'info' && styles.activeTabText
            ]}
          >
            Information
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'records' && styles.activeTab]}
          onPress={() => setActiveTab('records')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'records' && styles.activeTabText
            ]}
          >
            Medical Records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
          onPress={() => setActiveTab('appointments')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'appointments' && styles.activeTabText
            ]}
          >
            Appointments
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Patient Information */}
      {activeTab === 'info' && patientDetails && (
        <View style={styles.sectionContainer}>
          {/* Personal Information */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth:</Text>
                <Text style={styles.infoValue}>{formatDate(patientDetails.dateOfBirth)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{patientDetails.email}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{patientDetails.phone}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{patientDetails.address}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Emergency Contact:</Text>
                <Text style={styles.infoValue}>{patientDetails.emergencyContact}</Text>
              </View>
            </View>
          </View>
          
          {/* Medical Information */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Medical Information</Text>
            
            <View style={styles.infoCard}>
              {/* Allergies */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Allergies:</Text>
                {patientDetails.allergies && patientDetails.allergies.length > 0 ? (
                  <View style={styles.tagContainer}>
                    {patientDetails.allergies.map((allergy, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{allergy}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoValue}>No known allergies</Text>
                )}
              </View>
              
              {/* Medical Conditions */}
              <View style={[styles.infoRow, styles.lastRow]}>
                <Text style={styles.infoLabel}>Conditions:</Text>
                {patientDetails.conditions && patientDetails.conditions.length > 0 ? (
                  <View style={styles.tagContainer}>
                    {patientDetails.conditions.map((condition, index) => (
                      <View key={index} style={[styles.tag, styles.conditionTag]}>
                        <Text style={styles.conditionTagText}>{condition}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoValue}>No medical conditions</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
      
      {/* Medical Records */}
      {activeTab === 'records' && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medical Records</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('AddMedicalRecord', { patientId: actualPatientId })}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>New Record</Text>
            </TouchableOpacity>
          </View>
          
          {medicalRecords.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="document-text-outline" size={50} color="#adb5bd" />
              <Text style={styles.emptyStateText}>No medical records available</Text>
            </View>
          ) : (
            medicalRecords.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordCard}
                onPress={() => navigateToMedicalRecord(record.id)}
              >
                <View style={styles.recordHeader}>
                  <View style={styles.recordTypeContainer}>
                    <Ionicons 
                      name={
                        record.type === 'diagnosis' ? 'medical-outline' : 
                        record.type === 'prescription' ? 'medical' : 
                        record.type === 'lab' ? 'flask-outline' : 'document-text-outline'
                      } 
                      size={16} 
                      color="#007bff" 
                    />
                    <Text style={styles.recordType}>
                      {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                </View>
                
                <Text style={styles.recordTitle}>{record.title}</Text>
                <Text numberOfLines={2} style={styles.recordDescription}>{record.description}</Text>
                <Text style={styles.recordDoctor}>By: Dr. {record.doctorName}</Text>
                
                <View style={styles.viewDetailsContainer}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#007bff" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      
      {/* Appointments */}
      {activeTab === 'appointments' && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appointments</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('AppointmentBooking', { patientId: actualPatientId })}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Schedule</Text>
            </TouchableOpacity>
          </View>
          
          {appointments.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-outline" size={50} color="#adb5bd" />
              <Text style={styles.emptyStateText}>No appointments found</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => navigateToAppointmentDetails(appointment.id)}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.dateTimeContainer}>
                    <Ionicons name="calendar-outline" size={14} color="#6c757d" />
                    <Text style={styles.dateText}>{formatDate(appointment.date)}</Text>
                    <Ionicons name="time-outline" size={14} color="#6c757d" style={styles.timeIcon} />
                    <Text style={styles.timeText}>{formatTime(appointment.time)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: 
                      appointment.status === 'scheduled' ? '#007bff' : 
                      appointment.status === 'completed' ? '#28a745' : '#dc3545'
                  }]}>
                    <Text style={styles.statusText}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.appointmentReason}>{appointment.reason}</Text>
                
                {appointment.status === 'scheduled' && (
                  <View style={styles.appointmentActions}>
                    <TouchableOpacity 
                      style={styles.detailsButton}
                      onPress={() => navigateToAppointmentDetails(appointment.id)}
                    >
                      <Text style={styles.detailsButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  profileInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
    flex: 1,
    marginHorizontal: 6,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  actionText: {
    fontSize: 14,
    color: '#007bff',
    marginLeft: 6,
  },
  primaryActionText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#007bff',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 4,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  infoRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  lastRow: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#6c757d',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e7f1ff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginTop: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#007bff',
  },
  conditionTag: {
    backgroundColor: '#f8d7da',
  },
  conditionTagText: {
    fontSize: 12,
    color: '#dc3545',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 10,
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordType: {
    fontSize: 12,
    color: '#007bff',
    marginLeft: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
  },
  recordDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  recordDoctor: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 12,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007bff',
    marginRight: 4,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  timeIcon: {
    marginLeft: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  appointmentReason: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 12,
  },
  appointmentActions: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  detailsButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e7f1ff',
  },
  detailsButtonText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
});

export default DoctorPatientDetailsScreen;
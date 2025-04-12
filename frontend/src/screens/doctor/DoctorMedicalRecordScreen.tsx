import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { medicalHistoryService, patientService } from '../../services/api';

interface RouteParams {
  id: string;
  patientId: string;
  patientName: string;
}

interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  type: string;
  title: string;
  description: string;
  findings: string;
  diagnosis: string;
  treatment: string;
  medications: Medication[];
  attachments: Attachment[];
  followUp?: string;
  doctorName: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

const DoctorMedicalRecordScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const { id: recordId, patientId, patientName } = route.params as RouteParams;

  useEffect(() => {
    loadMedicalRecord();
  }, [recordId]);

  const loadMedicalRecord = async () => {
    try {
      setIsLoading(true);
      const recordData = await medicalHistoryService.getMedicalHistoryById(recordId);
      setRecord(recordData);
    } catch (error) {
      console.error('Failed to load medical record:', error);
      Alert.alert('Error', 'Failed to load medical record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRecord = () => {
    navigation.navigate('EditMedicalRecord', { 
      recordId, 
      patientId,
      patientName,
      onReturn: loadMedicalRecord 
    });
  };

  const handleDeleteRecord = () => {
    Alert.alert(
      'Delete Medical Record',
      'Are you sure you want to delete this medical record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await medicalHistoryService.deleteMedicalHistory(recordId);
              Alert.alert('Success', 'Medical record deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete medical record:', error);
              Alert.alert('Error', 'Failed to delete the medical record');
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleShareRecord = async () => {
    if (!record) return;
    
    try {
      const shareContent = {
        title: `Medical Record: ${record.title}`,
        message: `
Medical Record Information
-------------------------
Patient: ${patientName}
Date: ${formatDateDisplay(record.date)}
Type: ${record.type.charAt(0).toUpperCase() + record.type.slice(1)}
Title: ${record.title}
Doctor: Dr. ${record.doctorName}

Description: ${record.description}

Diagnosis: ${record.diagnosis}

Treatment: ${record.treatment}

Medications: ${record.medications.map(med => 
  `- ${med.name} (${med.dosage}): ${med.frequency} for ${med.duration}`
).join('\n')}

Follow-Up: ${record.followUp || 'None specified'}
        `,
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Failed to share medical record:', error);
      Alert.alert('Error', 'Failed to share the medical record');
    }
  };

  const navigateToPatientDetails = () => {
    navigation.navigate('PatientDetails', { id: patientId, patientName });
  };

  // Format date for display
  const formatDateDisplay = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
        <Text style={styles.errorText}>Medical record not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.recordTitle}>{record.title}</Text>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#6c757d" />
          <Text style={styles.dateText}>{formatDateDisplay(record.date)}</Text>
        </View>
      </View>
      
      {/* Patient Info */}
      <TouchableOpacity 
        style={styles.patientInfoContainer}
        onPress={navigateToPatientDetails}
      >
        <View style={styles.patientInfo}>
          <Ionicons name="person-outline" size={20} color="#6c757d" />
          <Text style={styles.patientName}>{patientName}</Text>
        </View>
        <View style={styles.viewPatientButton}>
          <Text style={styles.viewPatientText}>View Patient</Text>
          <Ionicons name="chevron-forward" size={16} color="#007bff" />
        </View>
      </TouchableOpacity>
      
      {/* Record Type */}
      <View style={styles.typeContainer}>
        <View style={styles.typeTag}>
          <Ionicons 
            name={
              record.type === 'diagnosis' ? 'medical-outline' : 
              record.type === 'prescription' ? 'medical' : 
              record.type === 'lab' ? 'flask-outline' : 'document-text-outline'
            } 
            size={14} 
            color="#ffffff" 
          />
          <Text style={styles.typeText}>
            {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
          </Text>
        </View>
        <Text style={styles.doctorText}>By: Dr. {record.doctorName}</Text>
      </View>
      
      {/* Record Details */}
      <View style={styles.detailsContainer}>
        {/* Description */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionText}>{record.description}</Text>
        </View>
        
        {/* Findings */}
        {record.findings && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Findings</Text>
            <Text style={styles.sectionText}>{record.findings}</Text>
          </View>
        )}
        
        {/* Diagnosis */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <Text style={styles.sectionText}>{record.diagnosis}</Text>
        </View>
        
        {/* Treatment */}
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Treatment</Text>
          <Text style={styles.sectionText}>{record.treatment}</Text>
        </View>
        
        {/* Medications */}
        {record.medications.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Medications</Text>
            {record.medications.map((medication, index) => (
              <View key={medication.id} style={styles.medicationItem}>
                <View style={styles.medicationHeader}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                </View>
                <Text style={styles.medicationDetails}>
                  {medication.frequency} • {medication.duration}
                </Text>
                {medication.instructions && (
                  <Text style={styles.medicationInstructions}>
                    Instructions: {medication.instructions}
                  </Text>
                )}
                {index < record.medications.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}
          </View>
        )}
        
        {/* Attachments */}
        {record.attachments.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            {record.attachments.map((attachment) => (
              <TouchableOpacity 
                key={attachment.id}
                style={styles.attachmentItem}
                onPress={() => navigation.navigate('ViewAttachment', { attachment })}
              >
                <Ionicons 
                  name={
                    attachment.type.includes('image') ? 'image-outline' : 
                    attachment.type.includes('pdf') ? 'document-outline' : 'document-attach-outline'
                  } 
                  size={24} 
                  color="#6c757d" 
                />
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName}>{attachment.name}</Text>
                  <Text style={styles.attachmentType}>
                    {attachment.type.toUpperCase().replace('APPLICATION/', '').replace('IMAGE/', '')}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#007bff" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Follow-Up */}
        {record.followUp && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Follow-Up</Text>
            <Text style={styles.sectionText}>{record.followUp}</Text>
          </View>
        )}
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEditRecord}
        >
          <Ionicons name="create-outline" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Edit Record</Text>
        </TouchableOpacity>
        
        <View style={styles.secondaryActions}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleShareRecord}
          >
            <Ionicons name="share-outline" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.secondaryButton, styles.deleteButton]}
            onPress={handleDeleteRecord}
          >
            <Ionicons name="trash-outline" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 6,
  },
  patientInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
    marginLeft: 8,
  },
  viewPatientButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewPatientText: {
    fontSize: 14,
    color: '#007bff',
    marginRight: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 4,
  },
  doctorText: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#212529',
  },
  medicationItem: {
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  medicationDosage: {
    fontSize: 14,
    color: '#212529',
  },
  medicationDetails: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  medicationInstructions: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 2,
  },
  attachmentType: {
    fontSize: 12,
    color: '#6c757d',
  },
  actionContainer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  editButton: {
    backgroundColor: '#007bff',
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
  },
  secondaryButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#f8d7da',
  },
});

export default DoctorMedicalRecordScreen;
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { medicalHistoryService } from '../../services/api';

// Define types for navigation
type RootStackParamList = {
  PatientMedicalRecords: undefined;
  PatientDocuments: undefined;
};

// Define types for medical record
interface MedicalRecord {
  id: string;
  title: string;
  type: string;
  doctor_name: string;
  date: string;
}

const PatientMedicalRecordsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch medical records from API
  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  const fetchMedicalRecords = async () => {
    try {
      setIsLoading(true);
      if (user?.id) {
        const data = await medicalHistoryService.getAllMedicalHistory({ patient_id: user.id });
        setRecords(data);
      }
    } catch (error) {
      console.error('Failed to load medical records:', error);
      Alert.alert('Error', 'Failed to load medical records. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDocuments = () => {
    navigation.navigate('PatientDocuments');
  };

  const getIconForRecordType = (type: string) => {
    switch(type) {
      case 'examination': return 'body-outline';
      case 'lab': return 'flask-outline';
      case 'vaccination': return 'fitness-outline';
      case 'consultation': return 'chatbubbles-outline';
      default: return 'document-text-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderRecordItem = ({ item }: { item: MedicalRecord }) => (
    <TouchableOpacity style={styles.recordItem}>
      <View style={styles.recordIconContainer}>
        <Ionicons name={getIconForRecordType(item.type)} size={24} color="#007bff" />
      </View>
      <View style={styles.recordInfo}>
        <Text style={styles.recordTitle}>{item.title}</Text>
        <Text style={styles.recordDoctor}>{item.doctor_name}</Text>
        <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <TouchableOpacity
          style={styles.documentsButton}
          onPress={navigateToDocuments}
        >
          <Text style={styles.documentsButtonText}>Documents</Text>
          <Ionicons name="document-text-outline" size={20} color="#007bff" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={records}
        renderItem={renderRecordItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={50} color="#ccc" />
            <Text style={styles.emptyStateText}>No medical records found</Text>
          </View>
        }
      />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  documentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  documentsButtonText: {
    color: '#007bff',
    fontWeight: '600',
    marginRight: 5,
  },
  listContent: {
    padding: 16,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 16,
    borderRadius: 10,
    elevation: 2,
  },
  recordIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});

export default PatientMedicalRecordsScreen;
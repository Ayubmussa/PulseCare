import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/api';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  image?: string;
  lastVisit?: string;
  diagnosis?: string;
  upcomingAppointment?: {
    id: string;
    date: string;
    time: string;
  };
}

const DoctorPatientListScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  const loadPatients = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setIsLoading(true);
      }
      
      if (user?.id) {
        const patientsData = await doctorService.getDoctorPatients(user.id);
        setPatients(patientsData);
        setFilteredPatients(patientsData);
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Load patients when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [loadPatients])
  );

  // Filter patients based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = patients.filter(patient => 
      patient.name.toLowerCase().includes(query) || 
      (patient.diagnosis && patient.diagnosis.toLowerCase().includes(query))
    );
    setFilteredPatients(filtered);
  }, [searchQuery, patients]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPatients(false);
  };

  const navigateToPatientDetails = (patient: Patient) => {
    // Check if we're coming from the chat screen to start a new chat
    const route = navigation.getState().routes[navigation.getState().index];
    const params = route.params as { action?: string } | undefined;
    
    if (params && params.action === 'newChat') {
      // Navigate to chat details to start a new chat with this patient
      navigation.navigate('ChatDetails', {
        participantId: patient.id,
        participantName: patient.name,
        participantType: 'patient',
        participantImage: patient.image,
        isNewChat: true
      });
    } else {
      // Regular navigation to patient details
      navigation.navigate('PatientDetails', {
        id: patient.id,
        patientName: patient.name,
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const renderPatientItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity 
      style={styles.patientCard}
      onPress={() => navigateToPatientDetails(item)}
    >
      <Image 
        source={{ uri: item.image || 'https://via.placeholder.com/60' }}
        style={styles.patientImage} 
      />
      
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <View style={styles.patientDetails}>
          <Text style={styles.detailText}>
            {item.age} years • {item.gender}
          </Text>
          {item.diagnosis && (
            <View style={styles.diagnosisContainer}>
              <Ionicons name="medical-outline" size={12} color="#6c757d" />
              <Text style={styles.diagnosisText} numberOfLines={1}>
                {item.diagnosis}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.visitInfo}>
        <Text style={styles.visitTimeLabel}>Last Visit</Text>
        <Text style={styles.visitTimeText}>{formatDate(item.lastVisit)}</Text>
        
        {item.upcomingAppointment && (
          <View style={styles.upcomingAppointmentTag}>
            <Ionicons name="calendar" size={12} color="#ffffff" />
            <Text style={styles.upcomingText}>Upcoming</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients by name or diagnosis"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#adb5bd" />
          </TouchableOpacity>
        )}
      </View>
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : (
        <>
          {filteredPatients.length === 0 ? (
            <View style={styles.emptyContainer}>
              {searchQuery.length > 0 ? (
                <>
                  <Ionicons name="search" size={50} color="#adb5bd" />
                  <Text style={styles.emptyText}>
                    No patients found matching "{searchQuery}"
                  </Text>
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={styles.clearSearchText}>Clear Search</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="people-outline" size={50} color="#adb5bd" />
                  <Text style={styles.emptyText}>You have no assigned patients yet</Text>
                </>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredPatients}
              keyExtractor={(item) => item.id}
              renderItem={renderPatientItem}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#007bff']}
                  tintColor="#007bff"
                />
              }
              ListHeaderComponent={() => (
                <Text style={styles.resultCount}>
                  {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'}
                </Text>
              )}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 20,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#007bff',
  },
  listContainer: {
    padding: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  patientImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  patientInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  patientDetails: {
    flexDirection: 'column',
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  diagnosisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagnosisText: {
    fontSize: 13,
    color: '#6c757d',
    marginLeft: 4,
    maxWidth: 150,
  },
  visitInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  visitTimeLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  visitTimeText: {
    fontSize: 13,
    color: '#212529',
    marginBottom: 8,
  },
  upcomingAppointmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  upcomingText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default DoctorPatientListScreen;
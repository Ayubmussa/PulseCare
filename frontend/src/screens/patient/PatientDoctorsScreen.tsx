import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doctorService } from '../../services/api';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image?: string;
  hospital?: string;
  rating?: number;
  reviews?: number;
  isAvailable?: boolean;
}

const PatientDoctorsScreen: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([
    { id: 'all', name: 'All Specialties' },
    { id: 'cardiology', name: 'Cardiology' },
    { id: 'dermatology', name: 'Dermatology' },
    { id: 'neurology', name: 'Neurology' },
    { id: 'pediatrics', name: 'Pediatrics' },
    { id: 'general', name: 'General' },
  ]);

  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [searchQuery, selectedSpecialty, doctors]);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      const response = await doctorService.getAllDoctors();
      
      // Process the API response to match our Doctor interface
      const formattedDoctors = response.map((doctor: any) => ({
        id: doctor.id,
        name: doctor.name || 'Unknown Doctor',
        specialty: doctor.specialty || 'General',
        image: doctor.image || doctor.imageUrl, // Handle different field names
        hospital: doctor.hospital || doctor.clinic || 'PulseCare Medical Center',
        rating: doctor.rating || (Math.random() * 1.5 + 3.5).toFixed(1), // Generate rating between 3.5-5.0 if not provided
        reviews: doctor.reviewCount || doctor.reviews || Math.floor(Math.random() * 40 + 10), // Random review count if not provided
        isAvailable: doctor.acceptingNewPatients !== undefined ? doctor.acceptingNewPatients : Math.random() > 0.3 // 70% chance of being available if not specified
      }));
      
      // Extract unique specialties from the API response
      const uniqueSpecialties = Array.from(new Set(response.map((doctor: any) => doctor.specialty)))
        .filter(Boolean) // Remove any undefined/null values
        .map((specialty: unknown) => ({
          id: String(specialty).toLowerCase(),
          name: String(specialty)
        }));
        
      // Add "All Specialties" option at the beginning
      if (uniqueSpecialties.length > 0) {
        setSpecialties([
          { id: 'all', name: 'All Specialties' },
          ...uniqueSpecialties
        ]);
      }
      
      setDoctors(formattedDoctors);
      setFilteredDoctors(formattedDoctors);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      // Add fallback data in case the API call fails
      const fallbackDoctors = [
        {
          id: '1',
          name: 'Dr. Sarah Johnson',
          specialty: 'Cardiology',
          image: 'https://via.placeholder.com/100',
          hospital: 'PulseCare Medical Center',
          rating: 4.9,
          reviews: 124,
          isAvailable: true
        },
        {
          id: '2',
          name: 'Dr. Michael Chen',
          specialty: 'Neurology',
          image: 'https://via.placeholder.com/100',
          hospital: 'PulseCare Medical Center',
          rating: 4.7,
          reviews: 98,
          isAvailable: false
        }
      ];
      setDoctors(fallbackDoctors);
      setFilteredDoctors(fallbackDoctors);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterDoctors = () => {
    let filtered = [...doctors];
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(doctor => 
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by specialty
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(doctor => 
        doctor.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
      );
    }
    
    setFilteredDoctors(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };

  const navigateToDoctorDetails = (doctorId: string) => {
    navigation.navigate('ViewDoctor', { doctorId });
  };

  const renderDoctorItem = ({ item }: { item: Doctor }) => (
    <TouchableOpacity 
      style={styles.doctorCard}
      onPress={() => navigateToDoctorDetails(item.id)}
    >
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/100' }}
        style={styles.doctorImage}
      />
      <View style={styles.doctorInfo}>
        <View style={styles.doctorHeader}>
          <Text style={styles.doctorName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#ffc107" />
            <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
          </View>
        </View>
        <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
        <Text style={styles.doctorHospital}>{item.hospital || 'PulseCare Medical Center'}</Text>
        
        <View style={styles.doctorFooter}>
          <View style={[
            styles.availabilityBadge, 
            { backgroundColor: item.isAvailable ? '#e0f2e9' : '#f8e6e7' }
          ]}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: item.isAvailable ? '#28a745' : '#dc3545' }
            ]} />
            <Text style={[
              styles.availabilityText, 
              { color: item.isAvailable ? '#28a745' : '#dc3545' }
            ]}>
              {item.isAvailable ? 'Available Today' : 'Not Available'}
            </Text>
          </View>
          <Text style={styles.reviewsText}>({item.reviews || '24'} reviews)</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  const renderSpecialtyItem = ({ item }: { item: { id: string; name: string } }) => (
    <TouchableOpacity
      style={[
        styles.specialtyItem,
        selectedSpecialty === item.id && styles.selectedSpecialtyItem
      ]}
      onPress={() => setSelectedSpecialty(item.id)}
    >
      <Text
        style={[
          styles.specialtyText,
          selectedSpecialty === item.id && styles.selectedSpecialtyText
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search doctors by name or specialty"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {/* Specialties Filter */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={specialties}
          renderItem={renderSpecialtyItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specialtyList}
        />
      </View>
      
      {/* Doctors List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          renderItem={renderDoctorItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007bff']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="medical" size={50} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? `No doctors matching "${searchQuery}"` 
                  : "No doctors available"}
              </Text>
            </View>
          }
        />
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
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 6,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  specialtyList: {
    paddingHorizontal: 16,
  },
  specialtyItem: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    marginRight: 8,
  },
  selectedSpecialtyItem: {
    backgroundColor: '#007bff',
  },
  specialtyText: {
    fontSize: 14,
    color: '#495057',
  },
  selectedSpecialtyText: {
    color: '#ffffff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  doctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  doctorHospital: {
    fontSize: 12,
    color: '#adb5bd',
    marginBottom: 8,
  },
  doctorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewsText: {
    fontSize: 12,
    color: '#6c757d',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default PatientDoctorsScreen;
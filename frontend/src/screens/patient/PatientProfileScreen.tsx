import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/api';

// Define interface for patient profile
interface PatientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  bloodType?: string;
  address?: string;
  emergencyContact?: string;
  profileImage?: string;
}

// Define navigation type using NativeStackNavigationProp for proper typing
type NavigationProp = NativeStackNavigationProp<any>;

const PatientProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, updateUserProfile } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from API
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!user?.id) return;
        
        setLoading(true);
        const patientData = await patientService.getPatientById(user.id);
        setProfile(patientData);
      } catch (error) {
        console.error('Failed to fetch patient profile:', error);
        Alert.alert(
          'Error',
          'Failed to load profile data. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigation.navigate('Login');
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen (you can implement this later)
    console.log('Editing profile...');
    // navigation.navigate('EditProfile', { profile });
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
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ 
              uri: profile?.profileImage || 'https://via.placeholder.com/150'
            }}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.name}>{profile?.name || user?.name || 'User'}</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Ionicons name="pencil" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={24} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || user?.email || 'Not provided'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={24} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile?.phone || 'Not provided'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={24} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>{profile?.dateOfBirth || 'Not provided'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="water-outline" size={24} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Blood Type</Text>
            <Text style={styles.infoValue}>{profile?.bloodType || 'Not provided'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={24} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{profile?.address || 'Not provided'}</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="alert-circle-outline" size={24} color="#007bff" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Emergency Contact</Text>
            <Text style={styles.infoValue}>{profile?.emergencyContact || 'Not provided'}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
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
    color: '#007bff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#007bff',
    elevation: 3,
  },
  profileImage: {
    width: 150,
    height: 150,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 15,
  },
  editButtonText: {
    marginLeft: 5,
    color: '#fff',
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    fontSize: 14,
  },
  infoValue: {
    color: '#333',
    fontSize: 16,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff3b30',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
});

export default PatientProfileScreen;
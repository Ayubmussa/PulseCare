import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/api';

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  experience: number;
  education: string;
  bio: string;
  officeHours: string;
  officeLocation: string;
  officePhone: string;
  acceptingNewPatients: boolean;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

const DoctorProfileScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [acceptingPatients, setAcceptingPatients] = useState<boolean>(true);
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, logout } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      
      if (user?.id) {
        const doctorData = await doctorService.getDoctorById(user.id);
        setProfile(doctorData);
        setAcceptingPatients(doctorData.acceptingNewPatients);
      }
    } catch (error) {
      console.error('Failed to load doctor profile:', error);
      Alert.alert('Error', 'Failed to load your profile information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAcceptingPatients = async () => {
    try {
      const newValue = !acceptingPatients;
      setAcceptingPatients(newValue);
      
      if (profile) {
        await doctorService.updateDoctor(profile.id, { 
          acceptingNewPatients: newValue 
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update your status');
      setAcceptingPatients(!acceptingPatients); // Revert if failed
    }
  };

  const handleEditProfile = () => {
    // Navigate within the Profile stack to the EditProfile screen
    navigation.navigate('EditProfile', { profile, onReturn: loadProfile });
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword', { userId: user?.id, onReturn: loadProfile });
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Navigate to the Login screen after logout completes
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
        <Text style={styles.errorText}>Failed to load profile information</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: profile.image || 'https://via.placeholder.com/150' }}
          style={styles.profileImage}
        />
        <Text style={styles.doctorName}>{profile.name}</Text>
        <Text style={styles.doctorSpecialty}>{profile.specialty}</Text>
        
        {profile.rating !== undefined && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#ffc107" />
            <Text style={styles.ratingText}>
              {profile.rating.toFixed(1)} ({profile.reviewCount} reviews)
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Ionicons name="pencil-outline" size={16} color="#ffffff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      
      {/* Profile Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoItem}>
          <Ionicons name="mail-outline" size={20} color="#6c757d" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="call-outline" size={20} color="#6c757d" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="school-outline" size={20} color="#6c757d" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>Education</Text>
            <Text style={styles.infoValue}>{profile.education}</Text>
          </View>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={20} color="#6c757d" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>Experience</Text>
            <Text style={styles.infoValue}>{profile.experience} years</Text>
          </View>
        </View>
      </View>
      
      {/* Office Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Office Information</Text>
        
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={20} color="#6c757d" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>Office Hours</Text>
            <Text style={styles.infoValue}>{profile.officeHours}</Text>
          </View>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={20} color="#6c757d" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>Office Location</Text>
            <Text style={styles.infoValue}>{profile.officeLocation}</Text>
          </View>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="call-outline" size={20} color="#6c757d" style={styles.infoIcon} />
          <View>
            <Text style={styles.infoLabel}>Office Phone</Text>
            <Text style={styles.infoValue}>{profile.officePhone}</Text>
          </View>
        </View>
      </View>
      
      {/* Professional Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </View>
      
      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="people-outline" size={20} color="#6c757d" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Accepting New Patients</Text>
          </View>
          <Switch
            value={acceptingPatients}
            onValueChange={handleToggleAcceptingPatients}
            trackColor={{ false: "#e9ecef", true: "#a8d4ff" }}
            thumbColor={acceptingPatients ? "#007bff" : "#f8f9fa"}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.settingButton}
          onPress={handleChangePassword}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#6c757d" style={styles.settingIcon} />
          <Text style={styles.settingButtonText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color="#adb5bd" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.settingButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc3545" style={styles.settingIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007bff',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  profileHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#212529',
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 6,
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#212529',
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#212529',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#212529',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  settingButtonText: {
    fontSize: 16,
    color: '#212529',
  },
  logoutButton: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#dc3545',
  },
});

export default DoctorProfileScreen;
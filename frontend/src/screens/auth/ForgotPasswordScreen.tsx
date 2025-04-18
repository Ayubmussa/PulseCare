import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<'patient' | 'doctor' | 'staff'>('patient');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    // Validate input
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    try {
      setIsLoading(true);
      // Assuming there will be a resetPassword function in the AuthContext
      await resetPassword(email, userType);
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Password reset failed:', error);
      
      // Provide user feedback
      if (error.response && error.response.status === 404) {
        if (userType === 'patient') {
          Alert.alert('Error', 'Patient account not found. Please check your email or register as a new patient.');
        } else if (userType === 'doctor') {
          Alert.alert('Error', 'Doctor account not found. Please check your email or contact administration.');
        } else if (userType === 'staff') {
          Alert.alert('Error', 'Staff account not found. Please check your email or contact administration.');
        }
      } else {
        Alert.alert('Error', 'Unable to process your request. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>PulseCare</Text>
          <Text style={styles.tagline}>Healthcare at your fingertips</Text>
        </View>

        <View style={styles.formContainer}>
          {!isEmailSent ? (
            <>
              <Text style={styles.welcomeText}>Forgot Password</Text>
              <Text style={styles.subtitleText}>
                Enter your email and we'll send you instructions to reset your password
              </Text>

              <View style={styles.userTypeContainer}>
                <TouchableOpacity 
                  style={[
                    styles.userTypeButton, 
                    userType === 'patient' && styles.activeUserTypeButton
                  ]}
                  onPress={() => setUserType('patient')}
                >
                  <Text style={[
                    styles.userTypeText,
                    userType === 'patient' && styles.activeUserTypeText
                  ]}>
                    Patient
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.userTypeButton, 
                    userType === 'doctor' && styles.activeUserTypeButton
                  ]}
                  onPress={() => setUserType('doctor')}
                >
                  <Text style={[
                    styles.userTypeText,
                    userType === 'doctor' && styles.activeUserTypeText
                  ]}>
                    Doctor
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.userTypeButton, 
                    userType === 'staff' && styles.activeUserTypeButton
                  ]}
                  onPress={() => setUserType('staff')}
                >
                  <Text style={[
                    styles.userTypeText,
                    userType === 'staff' && styles.activeUserTypeText
                  ]}>
                    Staff
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#28a745" style={styles.successIcon} />
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                We have sent password reset instructions to your email. Please check your inbox.
              </Text>
              <TouchableOpacity 
                style={styles.returnButton}
                onPress={navigateToLogin}
              >
                <Text style={styles.returnButtonText}>Return to Login</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomLinkContainer}>
            <Text style={styles.bottomText}>
              Remember your password?
            </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.bottomLink}> Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    color: '#6c757d',
  },
  formContainer: {
    paddingHorizontal: 25,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 25,
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 10,
    padding: 4,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeUserTypeButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userTypeText: {
    fontSize: 14,
    color: '#6c757d',
  },
  activeUserTypeText: {
    color: '#007bff',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#212529',
  },
  resetButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomText: {
    color: '#6c757d',
    fontSize: 14,
  },
  bottomLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  successMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  returnButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
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

const RegisterScreen: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { register } = useAuth();

  const handleRegister = async () => {
    // Validate inputs
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!dateOfBirth.trim()) {
      Alert.alert('Error', 'Please enter your date of birth');
      return;
    }

    try {
      setIsLoading(true);
      
      const userData = {
        name: fullName,
        email,
        phone,
        date_of_birth: dateOfBirth,
        password,
      };
      
      // Add more detailed error logging
      try {
        await register(userData, 'patient');
      } catch (registerError) {
        console.error('Detailed registration error:', registerError);
        throw registerError;
      }
      // No need to navigate, AuthContext will handle that
    } catch (error) {
      console.error('Registration failed:', error);
      // Provide more detailed error message if possible
      if (error instanceof Error) {
        Alert.alert('Registration Failed', error.message || 'Could not create account. Please try again.');
      } else {
        Alert.alert('Registration Failed', 'Could not create account. Please try again.');
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
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={navigateToLogin}
          >
            <Ionicons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Create Patient Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          <View style={styles.patientInfoBanner}>
            <Ionicons name="information-circle-outline" size={20} color="#007bff" />
            <Text style={styles.patientInfoText}>
              Patient registration only. Doctors and staff are managed by administrators.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#999"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
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

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Date of Birth (YYYY-MM-DD)"
              placeholderTextColor="#999"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#6c757d" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6c757d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By registering, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.registerText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}> Login</Text>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    marginBottom: 30,
  },
  backButton: {
    padding: 5,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  formContainer: {
    paddingHorizontal: 25,
  },
  patientInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1f5fe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#b3e5fc',
  },
  patientInfoText: {
    marginLeft: 8,
    color: '#0277bd',
    fontSize: 14,
    flex: 1,
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
  eyeIcon: {
    padding: 5,
  },
  termsContainer: {
    marginVertical: 15,
  },
  termsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#007bff',
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  registerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#6c757d',
    fontSize: 14,
  },
  loginLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
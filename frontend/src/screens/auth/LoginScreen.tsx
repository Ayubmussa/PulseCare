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

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { login } = useAuth();

  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      // No need to navigate, AuthContext will handle that
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Generic error message since we no longer know the user type in advance
      if (error.response && error.response.status === 404) {
        Alert.alert('Login Failed', 'Account not found. Please check your email or register if you\'re a new patient.');
      } else if (error.response && error.response.status === 401) {
        Alert.alert('Login Failed', 'Incorrect password. Please try again.');
      } else if (error.message && error.message.includes('user type')) {
        Alert.alert('Login Failed', error.message);
      } else {
        Alert.alert('Login Failed', 'Unable to log in. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    // Only patients can register themselves
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitleText}>Sign in to continue</Text>

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

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={navigateToForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.registerLink}> Register</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>
              Note: Registration is only available for patients. Doctor and staff accounts are managed by clinic administrators.
            </Text>
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  registerText: {
    color: '#6c757d',
    fontSize: 14,
  },
  registerLink: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoTextContainer: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default LoginScreen;
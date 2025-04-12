import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// User Role Navigators
import PatientNavigator from './src/navigation/PatientNavigator';
import DoctorNavigator from './src/navigation/DoctorNavigator';
import StaffNavigator from './src/navigation/StaffNavigator';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Define stack navigation types
const Stack = createNativeStackNavigator();

// Main navigator component that handles authentication state
const MainNavigator = () => {
  // Get authentication state from context
  const { user, userType, isLoading } = useAuth();

  // Show loading indicator while checking authentication state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        // User is logged in - show appropriate navigator based on user type
        <>
          {userType === 'patient' && <PatientNavigator />}
          {userType === 'doctor' && <DoctorNavigator />}
          {userType === 'staff' && <StaffNavigator />}
        </>
      ) : (
        // User is not logged in - show authentication stack
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

// Root App component that wraps everything with the AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
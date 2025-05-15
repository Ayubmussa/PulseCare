import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import doctor screens
import DoctorHomeScreen from '../screens/doctor/DoctorHomeScreen';
import DoctorAppointmentsScreen from '../screens/doctor/DoctorAppointmentsScreen';
import DoctorPatientListScreen from '../screens/doctor/DoctorPatientListScreen';
import DoctorPatientDetailsScreen from '../screens/doctor/DoctorPatientDetailsScreen';
import DoctorChatScreen from '../screens/doctor/DoctorChatScreen';
import DoctorChatDetailsScreen from '../screens/doctor/DoctorChatDetailsScreen';
import DoctorProfileScreen from '../screens/doctor/DoctorProfileScreen';
import DoctorScheduleScreen from '../screens/doctor/DoctorScheduleScreen';
import DoctorAppointmentDetailsScreen from '../screens/doctor/DoctorAppointmentDetailsScreen';
import DoctorMedicalRecordScreen from '../screens/doctor/DoctorMedicalRecordScreen';
import AddScheduleScreen from '../screens/doctor/AddScheduleScreen';
import ManageScheduleScreen from '../screens/doctor/ManageScheduleScreen';

// Create stacks for complex navigation flows
const HomeStack = createNativeStackNavigator();
const AppointmentStack = createNativeStackNavigator();
const PatientStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Home stack navigator
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="DoctorHome"
        component={DoctorHomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Schedule"
        component={DoctorScheduleScreen}
        options={{ title: 'My Schedule' }}
      />
      <HomeStack.Screen
        name="AddSchedule"
        component={AddScheduleScreen}
        options={{ title: 'Add Schedule' }}
      />
      <HomeStack.Screen
        name="ManageSchedule"
        component={ManageScheduleScreen}
        options={{ title: 'Manage Schedule' }}
      />
    </HomeStack.Navigator>
  );
};

// Appointments stack navigator
const AppointmentStackNavigator = () => {
  return (
    <AppointmentStack.Navigator>
      <AppointmentStack.Screen
        name="DoctorAppointments"
        component={DoctorAppointmentsScreen}
        options={{ headerShown: false }}
      />
      <AppointmentStack.Screen
        name="AppointmentDetails"
        component={DoctorAppointmentDetailsScreen}
        options={{ title: 'Appointment Details' }}
      />
      <AppointmentStack.Screen
        name="PatientDetails"
        component={DoctorPatientDetailsScreen}
        options={{ title: 'Patient Details' }}
      />
      <AppointmentStack.Screen
        name="MedicalRecord"
        component={DoctorMedicalRecordScreen}
        options={{ title: 'Medical Record' }}
      />
    </AppointmentStack.Navigator>
  );
};

// Patients stack navigator
const PatientStackNavigator = () => {
  return (
    <PatientStack.Navigator>
      <PatientStack.Screen
        name="PatientList"
        component={DoctorPatientListScreen}
        options={{ headerShown: false }}
      />
      <PatientStack.Screen
        name="PatientDetails"
        component={DoctorPatientDetailsScreen}
        options={({ route }: any) => ({ 
          title: route.params?.patientName || 'Patient Details'})}
      />
      <PatientStack.Screen
        name="MedicalRecord"
        component={DoctorMedicalRecordScreen}
        options={{ title: 'Medical Record' }}
      />
    </PatientStack.Navigator>
  );
};

// Chat stack navigator
const ChatStackNavigator = () => {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen
        name="DoctorChat"
        component={DoctorChatScreen}
        options={{ headerShown: false }}
      />
      <ChatStack.Screen
        name="ChatDetails"
        component={DoctorChatDetailsScreen}
        options={({ route }: any) => ({ 
          title: route.params?.patientName || 'Chat' 
        })}
      />
      <ChatStack.Screen
        name="PatientDetails"
        component={DoctorPatientDetailsScreen}
        options={({ route }: any) => ({ 
          title: route.params?.patientName || 'Patient Details'
        })}
      />
    </ChatStack.Navigator>
  );
};

// Profile stack navigator
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="DoctorProfile"
        component={DoctorProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={DoctorProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <ProfileStack.Screen
        name="ChangePassword"
        component={DoctorProfileScreen}
        options={{ title: 'Change Password' }}
      />
    </ProfileStack.Navigator>
  );
};

// Main Tab Navigator
const Tab = createBottomTabNavigator();

const DoctorNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Patients') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Appointments" component={AppointmentStackNavigator} />
      <Tab.Screen name="Patients" component={PatientStackNavigator} />
      <Tab.Screen name="Chat" component={ChatStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

export default DoctorNavigator;
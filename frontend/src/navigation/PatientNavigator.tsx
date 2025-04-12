import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import patient screens
import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import PatientAppointmentsScreen from '../screens/patient/PatientAppointmentsScreen';
import PatientProfileScreen from '../screens/patient/PatientProfileScreen';
import PatientMedicalRecordsScreen from '../screens/patient/PatientMedicalRecordsScreen';
import PatientChatScreen from '../screens/patient/PatientChatScreen';
import PatientChatDetailsScreen from '../screens/patient/PatientChatDetailsScreen';
import PatientViewDoctorScreen from '../screens/patient/PatientViewDoctorScreen';
import PatientBookAppointmentScreen from '../screens/patient/PatientBookAppointmentScreen';
import PatientDocumentsScreen from '../screens/patient/PatientDocumentsScreen';
import PatientDoctorsScreen from '../screens/patient/PatientDoctorsScreen';

// Create stacks for complex navigation flows
const HomeStack = createNativeStackNavigator();
const AppointmentStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const RecordsStack = createNativeStackNavigator();
const DoctorStack = createNativeStackNavigator();

// Home stack navigator
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="PatientHome"
        component={PatientHomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ViewDoctor"
        component={PatientViewDoctorScreen}
        options={{ title: 'Doctor Profile' }}
      />
      <HomeStack.Screen
        name="BookAppointment"
        component={PatientBookAppointmentScreen}
        options={{ title: 'Book Appointment' }}
      />
    </HomeStack.Navigator>
  );
};

// Appointments stack navigator
const AppointmentStackNavigator = () => {
  return (
    <AppointmentStack.Navigator>
      <AppointmentStack.Screen
        name="PatientAppointments"
        component={PatientAppointmentsScreen}
        options={{ headerShown: false }}
      />
      <AppointmentStack.Screen
        name="BookAppointment"
        component={PatientBookAppointmentScreen}
        options={{ title: 'Book Appointment' }}
      />
    </AppointmentStack.Navigator>
  );
};

// Chat stack navigator
const ChatStackNavigator = () => {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen
        name="PatientChat"
        component={PatientChatScreen}
        options={{ headerShown: false }}
      />
      <ChatStack.Screen
        name="ChatDetails"
        component={PatientChatDetailsScreen}
        options={({ route }: any) => ({ 
          title: route.params?.doctorName || 'Chat' 
        })}
      />
    </ChatStack.Navigator>
  );
};

// Medical Records stack navigator
const RecordsStackNavigator = () => {
  return (
    <RecordsStack.Navigator>
      <RecordsStack.Screen
        name="PatientMedicalRecords"
        component={PatientMedicalRecordsScreen}
        options={{ headerShown: false }}
      />
      <RecordsStack.Screen
        name="PatientDocuments"
        component={PatientDocumentsScreen}
        options={{ title: 'Documents' }}
      />
    </RecordsStack.Navigator>
  );
};

// Doctors stack navigator
const DoctorsStackNavigator = () => {
  return (
    <DoctorStack.Navigator>
      <DoctorStack.Screen
        name="DoctorsList"
        component={PatientDoctorsScreen}
        options={{ headerShown: true, title: 'All Doctors' }}
      />
      <DoctorStack.Screen
        name="ViewDoctor"
        component={PatientViewDoctorScreen}
        options={{ title: 'Doctor Profile' }}
      />
      <DoctorStack.Screen
        name="BookAppointment"
        component={PatientBookAppointmentScreen}
        options={{ title: 'Book Appointment' }}
      />
    </DoctorStack.Navigator>
  );
};

// Main Tab Navigator
const Tab = createBottomTabNavigator();

const PatientNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Records') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Doctors') {
            iconName = focused ? 'medkit' : 'medkit-outline';
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
      <Tab.Screen name="Doctors" component={DoctorsStackNavigator} />
      <Tab.Screen name="Chat" component={ChatStackNavigator} />
      <Tab.Screen name="Records" component={RecordsStackNavigator} />
      <Tab.Screen name="Profile" component={PatientProfileScreen} />
    </Tab.Navigator>
  );
};

export default PatientNavigator;
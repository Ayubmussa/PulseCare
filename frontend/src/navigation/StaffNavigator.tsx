import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import staff screens
import StaffHomeScreen from '../screens/staff/StaffHomeScreen';
import StaffClinicInfoScreen from '../screens/staff/StaffClinicInfoScreen';
import StaffManageAppointmentsScreen from '../screens/staff/StaffManageAppointmentsScreen';
import StaffManageDoctorsScreen from '../screens/staff/StaffManageDoctorsScreen';
import StaffManagePatientsScreen from '../screens/staff/StaffManagePatientsScreen';
import StaffProfileScreen from '../screens/staff/StaffProfileScreen';
import StaffAppointmentDetailsScreen from '../screens/staff/StaffAppointmentDetailsScreen';
import StaffDoctorDetailsScreen from '../screens/staff/StaffDoctorDetailsScreen';
import StaffPatientDetailsScreen from '../screens/staff/StaffPatientDetailsScreen';

// Create stacks for complex navigation flows
const HomeStack = createNativeStackNavigator();
const AppointmentStack = createNativeStackNavigator();
const DoctorStack = createNativeStackNavigator();
const PatientStack = createNativeStackNavigator();

// Home stack navigator
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="StaffHome"
        component={StaffHomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ClinicInfo"
        component={StaffClinicInfoScreen}
        options={{ title: 'Clinic Information' }}
      />
    </HomeStack.Navigator>
  );
};

// Appointments stack navigator
const AppointmentStackNavigator = () => {
  return (
    <AppointmentStack.Navigator>
      <AppointmentStack.Screen
        name="ManageAppointments"
        component={StaffManageAppointmentsScreen}
        options={{ headerShown: false }}
      />
      <AppointmentStack.Screen
        name="AppointmentDetails"
        component={StaffAppointmentDetailsScreen}
        options={{ title: 'Appointment Details' }}
      />
      <AppointmentStack.Screen
        name="DoctorDetails"
        component={StaffDoctorDetailsScreen}
        options={{ title: 'Doctor Details' }}
      />
      <AppointmentStack.Screen
        name="PatientDetails"
        component={StaffPatientDetailsScreen}
        options={{ title: 'Patient Details' }}
      />
    </AppointmentStack.Navigator>
  );
};

// Doctors stack navigator
const DoctorStackNavigator = () => {
  return (
    <DoctorStack.Navigator>
      <DoctorStack.Screen
        name="ManageDoctors"
        component={StaffManageDoctorsScreen}
        options={{ headerShown: false }}
      />
      <DoctorStack.Screen
        name="DoctorDetails"
        component={StaffDoctorDetailsScreen}
        options={({ route }: any) => ({ 
          title: route.params?.doctorName || 'Doctor Details' 
        })}
      />
    </DoctorStack.Navigator>
  );
};

// Patients stack navigator
const PatientStackNavigator = () => {
  return (
    <PatientStack.Navigator>
      <PatientStack.Screen
        name="ManagePatients"
        component={StaffManagePatientsScreen}
        options={{ headerShown: false }}
      />
      <PatientStack.Screen
        name="PatientDetails"
        component={StaffPatientDetailsScreen}
        options={({ route }: any) => ({ 
          title: route.params?.patientName || 'Patient Details' 
        })}
      />
    </PatientStack.Navigator>
  );
};

// Main Tab Navigator
const Tab = createBottomTabNavigator();

const StaffNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Doctors') {
            iconName = focused ? 'medkit' : 'medkit-outline';
          } else if (route.name === 'Patients') {
            iconName = focused ? 'people' : 'people-outline';
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
      <Tab.Screen name="Doctors" component={DoctorStackNavigator} />
      <Tab.Screen name="Patients" component={PatientStackNavigator} />
      <Tab.Screen name="Profile" component={StaffProfileScreen} />
    </Tab.Navigator>
  );
};

export default StaffNavigator;
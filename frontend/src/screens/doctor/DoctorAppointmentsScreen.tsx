import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, doctorService } from '../../services/api';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

const DoctorAppointmentsScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  useEffect(() => {
    loadAppointments();
  }, []);
  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      
      if (user?.id) {
        // Use the dedicated doctor appointments endpoint for better performance
        const doctorAppointments = await doctorService.getDoctorAppointments(user.id);
          // Transform the backend response to match the component's expected format
        const formattedAppointments = doctorAppointments.map((apt: any) => ({
          id: apt.id,
          patientId: apt.patient_id,
          patientName: apt.patients?.name || 'Unknown Patient',
          // Extract date and time from date_time field (format: "YYYY-MM-DDThh:mm")
          date: apt.date_time ? apt.date_time.split('T')[0] : '',
          time: apt.date_time ? apt.date_time.split('T')[1].substring(0, 5) : '00:00',
          reason: apt.reason || 'Medical consultation',
          // Normalize status: treat 'booked' as 'scheduled'
          status: apt.status === 'booked' ? 'scheduled' : apt.status || 'scheduled'
        }));
        
        setAppointments(formattedAppointments);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAppointments();
  };

  const navigateToAppointmentDetails = (appointmentId: string) => {
    navigation.navigate('AppointmentDetails', { id: appointmentId });
  };

  const navigateToChat = (patientId: string, patientName: string) => {
    // Navigate to the Chat tab and then to the ChatDetails screen
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Chat',
        params: {
          screen: 'ChatDetails',
          params: {
            patientId,
            patientName
          }
        }
      })
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  // Format time for display
  const formatTime = (timeString: string) => {
    // Handle both HH:MM and HH:MM:SS formats
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1] || '00';
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'booked':
        return '#007bff';
      case 'completed':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter((appointment) => {
    if (activeTab === 'upcoming') {
      return appointment.status === 'scheduled';
    }
    return appointment.status === activeTab;
  }).sort((a, b) => {
    if (activeTab === 'upcoming') {
      // Sort upcoming by date and time
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.time.localeCompare(b.time);
    } else {
      // Sort past appointments with most recent first
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return b.time.localeCompare(a.time);
    }
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'upcoming' && styles.activeTabText
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'completed' && styles.activeTabText
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'cancelled' && styles.activeTabText
            ]}
          >
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={50} color="#adb5bd" />
            <Text style={styles.emptyStateText}>
              {activeTab === 'upcoming' 
                ? "You don't have any upcoming appointments"
                : activeTab === 'completed'
                  ? "You don't have any completed appointments"
                  : "You don't have any cancelled appointments"
              }
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.appointmentCard}
            onPress={() => navigateToAppointmentDetails(item.id)}
          >
            <View style={styles.appointmentHeader}>
              <View style={styles.dateTimeContainer}>
                <Ionicons name="calendar-outline" size={14} color="#6c757d" />
                <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                <Ionicons name="time-outline" size={14} color="#6c757d" style={styles.timeIcon} />
                <Text style={styles.timeText}>{formatTime(item.time)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.appointmentContent}>
              <Text style={styles.patientNameText}>{item.patientName}</Text>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
            
            {activeTab === 'upcoming' && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => navigateToAppointmentDetails(item.id)}
                >
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => navigateToChat(item.patientId, item.patientName)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#007bff" />
                  <Text style={styles.chatButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab !== 'upcoming' && (
              <TouchableOpacity 
                style={styles.detailsButton}
                onPress={() => navigateToAppointmentDetails(item.id)}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#007bff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomColor: '#e9ecef',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#007bff',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 10,
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  timeIcon: {
    marginLeft: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  appointmentContent: {
    marginBottom: 16,
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: '#6c757d',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: '#e7f1ff',
    marginLeft: 8,
    flexDirection: 'row',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007bff',
    marginLeft: 6,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007bff',
    marginRight: 6,
  },
});

export default DoctorAppointmentsScreen;
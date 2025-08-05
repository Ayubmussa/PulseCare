import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { appointmentService, doctorService } from '../services/api';
import { 
  Calendar, 
  Users, 
  FileText, 
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  ArrowRight
} from 'lucide-react';

interface QuickStats {
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
}

interface UpcomingAppointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
}

interface PopularDoctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  totalRatings: number;
}

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<QuickStats>({
    totalAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [popularDoctors, setPopularDoctors] = useState<PopularDoctor[]>([]);
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load appointments
      const appointments = await appointmentService.getPatientAppointments(user!.id);
      
      // Calculate stats
      const upcomingCount = appointments.filter(apt => 
        apt.status === 'scheduled' && new Date(apt.date + ' ' + apt.time) > new Date()
      ).length;
      
      const completedCount = appointments.filter(apt => apt.status === 'completed').length;
      const cancelledCount = appointments.filter(apt => apt.status === 'cancelled').length;
      
      setStats({
        totalAppointments: appointments.length,
        upcomingAppointments: upcomingCount,
        completedAppointments: completedCount,
        cancelledAppointments: cancelledCount,
      });

      // Get upcoming appointments (next 3)
      const upcoming = appointments
        .filter(apt => apt.status === 'scheduled' && new Date(apt.date + ' ' + apt.time) > new Date())
        .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime())
        .slice(0, 3);
      
      setUpcomingAppointments(upcoming);

      // Load popular doctors
      const doctors = await doctorService.getAllDoctors();
      const topRatedDoctors = doctors
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 4)
        .map(doctor => ({
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          rating: doctor.rating,
          totalRatings: 0, // This would come from reviews data
        }));
      
      setPopularDoctors(topRatedDoctors);
      
    } catch (error) {      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickAccessItems = [
    {
      title: 'Book Appointment',
      description: 'Schedule a consultation with our doctors',
      icon: Calendar,
      href: '/doctors',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'View Doctors',
      description: 'Browse our network of healthcare professionals',
      icon: Users,
      href: '/doctors',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Medical Records',
      description: 'Access your health history and reports',
      icon: FileText,
      href: '/medical-records',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Chat with Doctor',
      description: 'Message your healthcare providers',
      icon: MessageCircle,
      href: '/chat',
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  const statCards = [
    {
      title: 'Total Appointments',
      value: stats.totalAppointments,
      icon: Calendar,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Upcoming',
      value: stats.upcomingAppointments,
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      title: 'Completed',
      value: stats.completedAppointments,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Cancelled',
      value: stats.cancelledAppointments,
      icon: XCircle,
      color: 'bg-red-50 text-red-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name || 'Patient'}! 👋
        </h1>
        <p className="text-primary-100">
          Manage your health journey with ease. Book appointments, chat with doctors, and track your medical records.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickAccessItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.href}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className={`p-3 rounded-lg ${item.color} w-fit mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                <div className="flex items-center text-primary-600 text-sm font-medium">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h2>
              <Link to="/appointments" className="text-primary-600 text-sm font-medium hover:text-primary-700">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Dr. {appointment.doctorName}
                      </p>
                      <p className="text-sm text-gray-500">{appointment.specialty}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{appointment.date}</p>
                      <p className="text-sm text-gray-500">{appointment.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No upcoming appointments</p>
                <Link
                  to="/doctors"
                  className="mt-2 inline-flex items-center text-primary-600 text-sm font-medium hover:text-primary-700"
                >
                  Book your first appointment
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Top Rated Doctors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Top Rated Doctors</h2>
              <Link to="/doctors" className="text-primary-600 text-sm font-medium hover:text-primary-700">
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {popularDoctors.length > 0 ? (
              <div className="space-y-4">
                {popularDoctors.map((doctor) => (
                  <div key={doctor.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Dr. {doctor.name}
                      </p>
                      <p className="text-sm text-gray-500">{doctor.specialty}</p>
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm font-medium text-gray-900">{doctor.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Loading doctors...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

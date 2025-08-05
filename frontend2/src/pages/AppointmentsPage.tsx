import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import { Appointment } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(`/appointments/patient/${user.id}`);
      const data = response.data;
      
      // Transform backend data to match frontend types
      const transformedAppointments: Appointment[] = data.map((apt: any) => ({
        id: apt.id,
        patientId: apt.patient_id,
        doctorId: apt.doctor_id,
        doctorName: apt.doctors?.name || 'Unknown Doctor',
        specialty: apt.doctors?.specialty || 'General',
        date: apt.date_time?.split('T')[0] || apt.date || '',
        time: apt.date_time ? new Date(apt.date_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }) : apt.time || '',
        status: apt.status || 'scheduled',
        notes: apt.notes || '',
        consultationFee: apt.consultation_fee || apt.consultationFee || 0,
        paymentStatus: apt.payment_status || apt.paymentStatus || 'pending'
      }));

      setAppointments(transformedAppointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      setCancelling(true);
      await apiService.put(`/appointments/${appointmentId}/cancel`);
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'cancelled' as const }
            : apt
        )
      );
      
      setShowCancelModal(false);
      setSelectedAppointment(null);
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError('Failed to cancel appointment. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    return appointments.filter(appointment => {
      switch (filter) {
        case 'upcoming':
          return appointment.status !== 'cancelled' && 
                 new Date(`${appointment.date}T${appointment.time}`) > now;
        case 'past':
          return appointment.status !== 'cancelled' && 
                 new Date(`${appointment.date}T${appointment.time}`) <= now;
        case 'cancelled':
          return appointment.status === 'cancelled';
        default:
          return true;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = getFilteredAppointments();

  if (loading && appointments.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-gray-600">View and manage your scheduled appointments</p>
        </div>
        <Link
          to="/book-appointment"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Book New Appointment
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'upcoming', 'past', 'cancelled'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption} ({appointments.filter(apt => {
                switch (filterOption) {
                  case 'upcoming':
                    return apt.status !== 'cancelled' && 
                           new Date(`${apt.date}T${apt.time}`) > new Date();
                  case 'past':
                    return apt.status !== 'cancelled' && 
                           new Date(`${apt.date}T${apt.time}`) <= new Date();
                  case 'cancelled':
                    return apt.status === 'cancelled';
                  default:
                    return true;
                }
              }).length})
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
          <p className="mt-1 text-sm text-gray-500 mb-4">
            {filter === 'all' ? 'You have no appointments scheduled.' : `No ${filter} appointments found.`}
          </p>
          {filter === 'all' && (
            <Link
              to="/book-appointment"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book Your First Appointment
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">
                      Dr. {appointment.doctorName}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(appointment.paymentStatus)}`}>
                      {appointment.paymentStatus}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Specialty:</span> {appointment.specialty}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(appointment.date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Time:</span> {appointment.time}
                    </div>
                  </div>

                  {appointment.consultationFee > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Fee:</span> ${appointment.consultationFee}
                    </div>
                  )}

                  {appointment.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Notes:</span> {appointment.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => setSelectedAppointment(appointment)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    View Details
                  </button>
                  
                  {appointment.status === 'scheduled' && new Date(`${appointment.date}T${appointment.time}`) > new Date() && (
                    <button
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setShowCancelModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && !showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Appointment Details</h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                    <p className="text-gray-900">Dr. {selectedAppointment.doctorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                    <p className="text-gray-900">{selectedAppointment.specialty}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-gray-900">{new Date(selectedAppointment.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <p className="text-gray-900">{selectedAppointment.time}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedAppointment.paymentStatus)}`}>
                      {selectedAppointment.paymentStatus}
                    </span>
                  </div>
                  {selectedAppointment.consultationFee > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
                      <p className="text-gray-900">${selectedAppointment.consultationFee}</p>
                    </div>
                  )}
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedAppointment.status === 'scheduled' && new Date(`${selectedAppointment.date}T${selectedAppointment.time}`) > new Date() && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.349 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cancel Appointment</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to cancel your appointment with Dr. {selectedAppointment.doctorName} 
                  on {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}?
                </p>
                <p className="text-xs text-red-600 mb-6">
                  This action cannot be undone. You may need to reschedule if you want to see this doctor again.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    if (!selectedAppointment) setSelectedAppointment(null);
                  }}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={() => handleCancelAppointment(selectedAppointment.id)}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {cancelling ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;

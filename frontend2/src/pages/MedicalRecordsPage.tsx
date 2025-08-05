import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { medicalRecordsService } from '../services/api';
import { MedicalRecord } from '../types';
import { 
  Calendar, 
  User, 
  FileText, 
  Pill, 
  Activity, 
  Search, 
  Filter, 
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Heart,
  Thermometer,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const MedicalRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'doctor'>('all');
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());  useEffect(() => {
    if (user?.id) {
      fetchMedicalRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    filterRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, searchTerm, filterBy]);

  const fetchMedicalRecords = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await medicalRecordsService.getPatientMedicalRecords(user.id);
      setRecords(data);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast.error('Failed to load medical records');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.treatment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterBy === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(record => new Date(record.date) >= thirtyDaysAgo);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredRecords(filtered);
  };

  const toggleRecordExpanded = (recordId: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRecords(newExpanded);
  };

  const handleViewDetails = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRecordStatusColor = (date: string) => {
    const recordDate = new Date(date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) return 'bg-green-100 text-green-800';
    if (daysDiff <= 30) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Medical Records</h1>
        <p className="text-gray-600">Access your complete medical history and health records</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {records.filter(r => {
                  const recordDate = new Date(r.date);
                  const thisMonth = new Date();
                  return recordDate.getMonth() === thisMonth.getMonth() && 
                         recordDate.getFullYear() === thisMonth.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doctors Seen</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(records.map(r => r.doctorId)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Visit</p>
              <p className="text-sm font-bold text-gray-900">
                {records.length > 0 
                  ? formatDate(records.sort((a, b) => 
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    )[0]?.date) 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search records by diagnosis, doctor, treatment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as 'all' | 'recent' | 'doctor')}
              className="input pl-10 pr-8 appearance-none bg-white"
            >
              <option value="all">All Records</option>
              <option value="recent">Recent (30 days)</option>
              <option value="doctor">By Doctor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No medical records found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search criteria' : 'Your medical records will appear here after your appointments'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRecordStatusColor(record.date)}`}>
                      {formatDate(record.date)}
                    </span>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-1" />
                      Dr. {record.doctorName}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{record.diagnosis}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Treatment</p>
                      <p className="text-sm text-gray-600">{record.treatment}</p>
                    </div>
                    {record.symptoms && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Symptoms</p>
                        <p className="text-sm text-gray-600">{record.symptoms}</p>
                      </div>
                    )}
                  </div>

                  {expandedRecords.has(record.id) && (
                    <div className="border-t pt-4 mt-4">
                      {/* Medications */}
                      {record.medications && record.medications.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Pill className="h-4 w-4 mr-1" />
                            Medications
                          </h4>
                          <div className="space-y-2">
                            {record.medications.map((med, index) => (
                              <div key={index} className="bg-gray-50 rounded-lg p-3">
                                <p className="font-medium text-sm">{med.name}</p>
                                {med.dosage && <p className="text-xs text-gray-600">Dosage: {med.dosage}</p>}
                                {med.frequency && <p className="text-xs text-gray-600">Frequency: {med.frequency}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vital Signs */}
                      {record.vitalSigns && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Activity className="h-4 w-4 mr-1" />
                            Vital Signs
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {record.vitalSigns.bloodPressure && (
                              <div className="bg-red-50 rounded-lg p-3">
                                <div className="flex items-center mb-1">
                                  <Heart className="h-4 w-4 text-red-500 mr-1" />
                                  <span className="text-xs font-medium text-red-700">Blood Pressure</span>
                                </div>
                                <p className="text-sm font-semibold">{record.vitalSigns.bloodPressure}</p>
                              </div>
                            )}
                            {record.vitalSigns.heartRate && (
                              <div className="bg-pink-50 rounded-lg p-3">
                                <div className="flex items-center mb-1">
                                  <Activity className="h-4 w-4 text-pink-500 mr-1" />
                                  <span className="text-xs font-medium text-pink-700">Heart Rate</span>
                                </div>
                                <p className="text-sm font-semibold">{record.vitalSigns.heartRate} bpm</p>
                              </div>
                            )}
                            {record.vitalSigns.temperature && (
                              <div className="bg-orange-50 rounded-lg p-3">
                                <div className="flex items-center mb-1">
                                  <Thermometer className="h-4 w-4 text-orange-500 mr-1" />
                                  <span className="text-xs font-medium text-orange-700">Temperature</span>
                                </div>
                                <p className="text-sm font-semibold">{record.vitalSigns.temperature}°F</p>
                              </div>
                            )}
                            {record.vitalSigns.weight && (
                              <div className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center mb-1">
                                  <Scale className="h-4 w-4 text-blue-500 mr-1" />
                                  <span className="text-xs font-medium text-blue-700">Weight</span>
                                </div>
                                <p className="text-sm font-semibold">{record.vitalSigns.weight} lbs</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {record.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleViewDetails(record)}
                    className="btn btn-outline btn-sm flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => toggleRecordExpanded(record.id)}
                    className="btn btn-ghost btn-sm p-2"
                  >
                    {expandedRecords.has(record.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Medical Record Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date</p>
                    <p className="text-gray-900">{formatDate(selectedRecord.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Doctor</p>
                    <p className="text-gray-900">Dr. {selectedRecord.doctorName}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Diagnosis</p>
                  <p className="text-gray-900">{selectedRecord.diagnosis}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Treatment</p>
                  <p className="text-gray-900">{selectedRecord.treatment}</p>
                </div>

                {selectedRecord.symptoms && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Symptoms</p>
                    <p className="text-gray-900">{selectedRecord.symptoms}</p>
                  </div>
                )}

                {selectedRecord.prescription && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Prescription</p>
                    <p className="text-gray-900">{selectedRecord.prescription}</p>
                  </div>
                )}

                {selectedRecord.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Additional Notes</p>
                    <p className="text-gray-900">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn btn-outline"
                >
                  Close
                </button>
                <button className="btn btn-primary flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordsPage;

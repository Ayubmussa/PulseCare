import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorService } from '../services/api';
import { Doctor } from '../types';
import { 
  Search, 
  Filter, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  User,
  Award,
  DollarSign,
  Stethoscope,
  Grid,
  List,
  Heart,
  Eye,
  Brain,
  Baby,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'rating' | 'experience' | 'fee';

const SPECIALTIES = [
  'All Specialties',
  'Cardiology',
  'Dermatology', 
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'General Medicine',
  'Gynecology',
  'Ophthalmology',
  'Dentistry',
  'Emergency Medicine',
  'Radiology',
  'Anesthesiology',
  'Pathology'
];

const DoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    filterAndSortDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, searchTerm, selectedSpecialty, sortBy, priceRange]);  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await doctorService.getAllDoctors();
      
      // Transform data to ensure compatibility
      const transformedData = data.map(doctor => ({
        ...doctor,
        qualifications: doctor.education || doctor.qualifications || 'Not specified',
        profileImage: doctor.image || doctor.profileImage,
        address: doctor.officeLocation || doctor.address || 'Location not specified',
        consultationFee: doctor.consultationFee || Math.floor(Math.random() * 200) + 50, // Default range if not provided
      }));
      
      setDoctors(transformedData);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setError('Failed to load doctors. Please try again.');
      toast.error('Failed to load doctors');
    } finally {
      setIsLoading(false);
    }
  };
  const filterAndSortDoctors = () => {
    let filtered = doctors;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doctor => 
        doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doctor.qualifications || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Specialty filter
    if (selectedSpecialty !== 'All Specialties') {
      filtered = filtered.filter(doctor => doctor.specialty === selectedSpecialty);
    }

    // Price range filter
    filtered = filtered.filter(doctor => {
      const fee = doctor.consultationFee || 0;
      return fee >= priceRange[0] && fee <= priceRange[1];
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'experience':
          return b.experience - a.experience;
        case 'fee':
          return (a.consultationFee || 0) - (b.consultationFee || 0);
        default:
          return 0;
      }
    });

    setFilteredDoctors(filtered);
  };

  const getSpecialtyIcon = (specialty: string) => {
    switch (specialty.toLowerCase()) {
      case 'cardiology':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'neurology':
        return <Brain className="h-5 w-5 text-purple-500" />;
      case 'pediatrics':
        return <Baby className="h-5 w-5 text-blue-500" />;
      case 'ophthalmology':
        return <Eye className="h-5 w-5 text-green-500" />;
      default:
        return <Stethoscope className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };  const handleBookAppointment = (doctor: Doctor) => {
    // Navigate to booking page with doctor pre-selected
    navigate(`/book-appointment?doctorId=${doctor.id}`);
  };

  const handleViewProfile = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowDoctorModal(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSpecialty('All Specialties');
    setPriceRange([0, getMaxFee()]);
    setSortBy('rating');
  };
  const getMaxFee = () => {
    const fees = doctors.map(d => d.consultationFee || 0).filter(fee => fee > 0);
    return fees.length > 0 ? Math.max(...fees) : 500;
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="card p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Doctors</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDoctors}
            className="btn btn-primary flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Doctors</h1>
        <p className="text-gray-600">Find and book appointments with our qualified healthcare professionals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Doctors</p>
              <p className="text-2xl font-bold text-gray-900">{doctors.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Stethoscope className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Specialties</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(doctors.map(d => d.specialty)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {doctors.length > 0 
                  ? (doctors.reduce((acc, d) => acc + d.rating, 0) / doctors.length).toFixed(1)
                  : '0.0'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Experience</p>
              <p className="text-2xl font-bold text-gray-900">
                {doctors.length > 0 
                  ? Math.round(doctors.reduce((acc, d) => acc + d.experience, 0) / doctors.length)
                  : '0'
                } yrs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Search */}
          <div className="lg:col-span-4">
            <label className="label">Search Doctors</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, specialty, or qualifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Specialty Filter */}
          <div className="lg:col-span-2">
            <label className="label">Specialty</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="input pl-10 pr-8 appearance-none bg-white w-full"
              >
                {SPECIALTIES.map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div className="lg:col-span-2">
            <label className="label">Price Range</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={getMaxFee()}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full"
              />
              <span className="text-sm text-gray-600 whitespace-nowrap">
                ${priceRange[0]}-${priceRange[1]}
              </span>
            </div>
          </div>

          {/* Sort */}
          <div className="lg:col-span-2">
            <label className="label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="input w-full"
            >
              <option value="rating">Rating</option>
              <option value="name">Name</option>
              <option value="experience">Experience</option>
              <option value="fee">Consultation Fee</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="lg:col-span-2">
            <label className="label">View</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg flex-1 flex items-center justify-center gap-1 ${
                  viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 border'
                }`}
              >
                <Grid className="h-4 w-4" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg flex-1 flex items-center justify-center gap-1 ${
                  viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 border'
                }`}
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>
          </div>
        </div>
      </div>      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <p className="text-gray-600">
            Showing {filteredDoctors.length} of {doctors.length} doctors
          </p>
          {(searchTerm || selectedSpecialty !== 'All Specialties' || priceRange[0] > 0 || priceRange[1] < getMaxFee()) && (
            <button
              onClick={clearFilters}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
        <button
          onClick={fetchDoctors}
          disabled={isLoading}
          className="btn btn-outline btn-sm flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Doctors Display */}
      {filteredDoctors.length === 0 ? (
        <div className="card p-12 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredDoctors.map((doctor) => (
            <div key={doctor.id} className={`card p-6 ${viewMode === 'list' ? 'flex items-center' : ''}`}>
              {viewMode === 'grid' ? (
                // Grid View
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                        {doctor.profileImage ? (
                          <img 
                            src={doctor.profileImage} 
                            alt={doctor.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-primary-600" />
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">Dr. {doctor.name}</h3>
                        <div className="flex items-center text-sm text-gray-600">
                          {getSpecialtyIcon(doctor.specialty)}
                          <span className="ml-1">{doctor.specialty}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Award className="h-4 w-4 mr-2" />
                      <span>{doctor.experience} years experience</span>
                    </div>
                      <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span>${doctor.consultationFee || 'Price on request'} consultation</span>
                    </div>

                    {renderStars(doctor.rating)}
                  </div>                  <div className="text-sm text-gray-600 mb-4">
                    <p className="line-clamp-2">{doctor.qualifications || 'Qualifications not specified'}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewProfile(doctor)}
                      className="btn btn-outline btn-sm flex-1"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleBookAppointment(doctor)}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Book Now
                    </button>
                  </div>
                </>
              ) : (
                // List View
                <>
                  <div className="flex items-center flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      {doctor.profileImage ? (
                        <img 
                          src={doctor.profileImage} 
                          alt={doctor.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Dr. {doctor.name}</h3>
                        {renderStars(doctor.rating)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center">
                          {getSpecialtyIcon(doctor.specialty)}
                          <span className="ml-1">{doctor.specialty}</span>
                        </div>
                        <div className="flex items-center">
                          <Award className="h-4 w-4 mr-1" />
                          <span>{doctor.experience} yrs</span>
                        </div>                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>${doctor.consultationFee || 'On request'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleViewProfile(doctor)}
                      className="btn btn-outline btn-sm"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleBookAppointment(doctor)}
                      className="btn btn-primary btn-sm"
                    >
                      Book Appointment
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Doctor Profile Modal */}
      {showDoctorModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Doctor Profile</h3>
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
                  {selectedDoctor.profileImage ? (
                    <img 
                      src={selectedDoctor.profileImage} 
                      alt={selectedDoctor.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-primary-600" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Dr. {selectedDoctor.name}</h2>
                  <div className="flex items-center gap-2 mb-2">
                    {getSpecialtyIcon(selectedDoctor.specialty)}
                    <span className="text-lg text-gray-600">{selectedDoctor.specialty}</span>
                  </div>
                  {renderStars(selectedDoctor.rating)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Experience</h4>
                  <p className="text-gray-600">{selectedDoctor.experience} years</p>
                </div>
                  <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Consultation Fee</h4>
                  <p className="text-gray-600">${selectedDoctor.consultationFee || 'Price on request'}</p>
                </div>

                {selectedDoctor.phone && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Phone</h4>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{selectedDoctor.phone}</span>
                    </div>
                  </div>
                )}

                {selectedDoctor.email && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Email</h4>
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{selectedDoctor.email}</span>
                    </div>
                  </div>
                )}
              </div>              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Qualifications</h4>
                <p className="text-gray-600">{selectedDoctor.qualifications || selectedDoctor.education || 'Qualifications not specified'}</p>
              </div>

              {/* Additional Information */}
              {selectedDoctor.bio && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">About Doctor</h4>
                  <p className="text-gray-600">{selectedDoctor.bio}</p>
                </div>
              )}

              {selectedDoctor.officeHours && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Office Hours</h4>
                  <p className="text-gray-600">{selectedDoctor.officeHours}</p>
                </div>
              )}

              {selectedDoctor.acceptingNewPatients !== undefined && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Accepting New Patients</h4>
                  <p className={`text-sm px-2 py-1 rounded-full inline-block ${
                    selectedDoctor.acceptingNewPatients 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedDoctor.acceptingNewPatients ? 'Yes' : 'No'}
                  </p>
                </div>
              )}

              {selectedDoctor.address && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
                  <div className="flex items-start text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 mt-1" />
                    <span>{selectedDoctor.address}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDoctorModal(false)}
                  className="btn btn-outline"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleBookAppointment(selectedDoctor);
                    setShowDoctorModal(false);
                  }}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsPage;

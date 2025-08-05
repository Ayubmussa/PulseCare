import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Edit3, Save, X, Mail, Phone, Calendar, MapPin, User as UserIcon, Key, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditableUser {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editData, setEditData] = useState<EditableUser>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    address: user?.address || '',
  });
  const [errors, setErrors] = useState<Partial<EditableUser>>({});
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});  // Update editData when user changes (e.g., after login)
  React.useEffect(() => {
    if (user) {
      setEditData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const validatePasswordForm = (): boolean => {
    const newErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      // Here you would call the API to change password
      // For now, we'll just show a success message
      toast.success('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
    } catch (error) {
      toast.error('Failed to change password. Please try again.');
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswordFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EditableUser> = {};

    // Name validation
    if (!editData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (editData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(editData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional but if provided, should be valid)
    if (editData.phone && !/^\+?[\d\s\-()]{10,}$/.test(editData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Date of birth validation (optional but if provided, should be valid)
    if (editData.dateOfBirth) {
      const birthDate = new Date(editData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      } else if (age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof EditableUser]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to original user data
    if (user) {
      setEditData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
        address: user.address || '',
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Transform data to match backend expectations
      const updateData = {
        name: editData.name.trim(),
        email: editData.email.toLowerCase().trim(),
        phone: editData.phone || undefined,
        dateOfBirth: editData.dateOfBirth || undefined,
        gender: editData.gender || undefined,
        address: editData.address?.trim() || undefined,
      };

      const success = await updateProfile(updateData);
      
      if (success) {
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your personal information and account settings</p>
          </div>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="btn btn-primary btn-md flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="btn btn-outline btn-md flex items-center gap-2"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary btn-md flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">        {/* Profile Picture Section */}
        <div className="lg:col-span-1">
          <div className="card p-6 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
                <UserIcon className="w-16 h-16 text-primary-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {isEditing ? editData.name || 'Your Name' : user.name}
            </h3>
            <p className="text-gray-600">Patient</p>
          </div>

          {/* Quick Stats */}
          <div className="card p-6 mt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Account Info</h4>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Member since</span>
                <span className="ml-auto font-medium">2024</span>
              </div>
              <div className="flex items-center text-sm">
                <User className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Account Type</span>
                <span className="ml-auto font-medium">Patient</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="label">
                  Full Name <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={editData.name}
                      onChange={handleInputChange}
                      className={`input pl-10 ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter your full name"
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{user.name || 'Not provided'}</span>
                  </div>
                )}
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="label">
                  Email Address <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleInputChange}
                      className={`input pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter your email"
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{user.email}</span>
                  </div>
                )}
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="label">Phone Number</label>
                {isEditing ? (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={editData.phone}
                      onChange={handleInputChange}
                      className={`input pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="Enter your phone number"
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{user.phone || 'Not provided'}</span>
                  </div>
                )}
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="label">Date of Birth</label>
                {isEditing ? (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={editData.dateOfBirth}
                      onChange={handleInputChange}
                      className={`input pl-10 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">
                      {user.dateOfBirth 
                        ? new Date(user.dateOfBirth).toLocaleDateString() 
                        : 'Not provided'
                      }
                    </span>
                  </div>
                )}
                {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
              </div>

              {/* Gender */}
              <div>
                <label className="label">Gender</label>
                {isEditing ? (
                  <div className="mt-1">
                    <select
                      name="gender"
                      value={editData.gender}
                      onChange={handleInputChange}
                      className="input"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900 capitalize">
                      {user.gender || 'Not specified'}
                    </span>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="label">Address</label>
                {isEditing ? (
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="address"
                      value={editData.address}
                      onChange={handleInputChange}
                      className="input pl-10"
                      placeholder="Enter your address"
                    />
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{user.address || 'Not provided'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>          {/* Security Section */}
          <div className="card p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Password</h4>
                  <p className="text-sm text-gray-600">Last updated 3 months ago</p>
                </div>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="btn btn-outline btn-sm"
                >
                  Change Password
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">Add an extra layer of security</p>
                </div>
                <button className="btn btn-outline btn-sm">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                  setPasswordErrors({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="label">Current Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPasswordFields.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({
                        ...prev,
                        currentPassword: e.target.value
                      }));
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors(prev => ({
                          ...prev,
                          currentPassword: undefined
                        }));
                      }
                    }}
                    className={`input pr-10 ${passwordErrors.currentPassword ? 'border-red-500' : ''}`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswordFields.current ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="label">New Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPasswordFields.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({
                        ...prev,
                        newPassword: e.target.value
                      }));
                      if (passwordErrors.newPassword) {
                        setPasswordErrors(prev => ({
                          ...prev,
                          newPassword: undefined
                        }));
                      }
                    }}
                    className={`input pr-10 ${passwordErrors.newPassword ? 'border-red-500' : ''}`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswordFields.new ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="label">Confirm New Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPasswordFields.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }));
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors(prev => ({
                          ...prev,
                          confirmPassword: undefined
                        }));
                      }
                    }}
                    className={`input pr-10 ${passwordErrors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswordFields.confirm ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                  setPasswordErrors({});
                }}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Key className="h-4 w-4" />
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

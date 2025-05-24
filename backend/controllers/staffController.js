const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');

// Get all staff members
const getAllStaffMembers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*');
    
    if (error) throw error;
    
    // Transform data to match UI expectations
    const transformedData = data.map(staff => ({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phoneNumber: staff.phone,
      role: staff.role,
      employeeId: staff.employee_id || 'EMP-' + staff.id.slice(0, 8).toUpperCase(),
      department: staff.department || 'General',
      joinDate: staff.join_date || staff.created_at?.split('T')[0],
      workHours: staff.work_hours || '9:00 AM - 5:00 PM',
      supervisor: staff.supervisor || 'Not assigned',
      image: staff.image || null,
      status: staff.status || 'active',
      clinic_id: staff.clinic_id,
      created_at: staff.created_at
    }));
    
    res.status(200).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get staff member by ID
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Transform data to match UI expectations with default values for missing fields
    const transformedData = {
      id: data.id,
      name: data.name,
      email: data.email,
      phoneNumber: data.phone, // Map phone to phoneNumber for UI compatibility
      role: data.role,
      employeeId: data.employee_id || 'EMP-' + data.id.slice(0, 8).toUpperCase(),
      department: data.department || 'General',
      joinDate: data.join_date || data.created_at?.split('T')[0], // Fallback to created_at
      workHours: data.work_hours || '9:00 AM - 5:00 PM',
      supervisor: data.supervisor || 'Not assigned',
      image: data.image || null,
      status: data.status || 'active',
      clinic_id: data.clinic_id,
      created_at: data.created_at
    };
    
    res.status(200).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new staff member
const createStaff = async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    
    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }    // Prepare the staff data (using plain text password for consistency)
    const staffData = { 
      name, 
      email, 
      phone, 
      role, 
      password 
    };
    
    // Note: clinic_id is intentionally not included here to allow the database to generate it
    
    const { data, error } = await supabase
      .from('staff')
      .insert([staffData])
      .select();
    
    if (error) {
      console.error('Supabase error during staff creation:', error);
      throw error;
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update staff member
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      phoneNumber, // Support both field names
      role,
      employeeId,
      employee_id, // Support both field names
      department,
      joinDate,
      join_date, // Support both field names
      workHours,
      work_hours, // Support both field names
      supervisor,
      image,
      status
    } = req.body;
    
    // Use the correct field names for the database
    const updateData = {
      name,
      email,
      phone: phone || phoneNumber,
      role,
      employee_id: employee_id || employeeId,
      department,
      join_date: join_date || joinDate,
      work_hours: work_hours || workHours,
      supervisor,
      image,
      status
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const { data, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    // Transform response to match UI expectations
    const transformedData = {
      id: data[0].id,
      name: data[0].name,
      email: data[0].email,
      phoneNumber: data[0].phone,
      role: data[0].role,
      employeeId: data[0].employee_id || 'EMP-' + data[0].id.slice(0, 8).toUpperCase(),
      department: data[0].department || 'General',
      joinDate: data[0].join_date || data[0].created_at?.split('T')[0],
      workHours: data[0].work_hours || '9:00 AM - 5:00 PM',
      supervisor: data[0].supervisor || 'Not assigned',
      image: data[0].image || null,
      status: data[0].status || 'active',
      clinic_id: data[0].clinic_id,
      created_at: data[0].created_at
    };
    
    res.status(200).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete staff member
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login staff
const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find staff with the given email
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
      // Check password (plain text comparison for consistency)
    if (data.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate a JWT token (in a real app, you would use jsonwebtoken package)
    const token = 'staff_' + Math.random().toString(36).substring(2, 15);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = data;
    
    res.status(200).json({
      user: userWithoutPassword,
      token,
      userType: 'staff'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset staff password
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    
    // Check if staff exists
    const { data: staff, error: findError } = await supabase
      .from('staff')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (findError) throw findError;
    
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
      // Update the password directly (plain text for consistency)
    const { data, error } = await supabase
      .from('staff')
      .update({ password: newPassword })
      .eq('id', staff.id);
    
    if (error) throw error;
    
    res.status(200).json({ 
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Staff password reset error:', error);
    res.status(500).json({ error: error.message });
  }
};

// NEW METHODS FOR HEALTHCARE PROFESSIONAL MANAGEMENT

// Get all doctors for staff management
const getAllDoctors = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('*');
    
    if (error) throw error;
    
    // Transform data to match UI expectations
    const transformedData = data.map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      specialty: doctor.specialty,
      experience: doctor.experience || 0,
      education: doctor.education || 'Not specified',
      bio: doctor.bio || 'No bio available',
      officeHours: doctor.office_hours || 'Please contact for availability',
      officeLocation: doctor.office_location || 'Location not specified',
      officePhone: doctor.office_phone || doctor.phone,
      acceptingNewPatients: doctor.accepting_new_patients !== undefined ? doctor.accepting_new_patients : true,
      image: doctor.image || null,
      rating: doctor.rating || 0.0,
      reviewCount: doctor.review_count || 0,
      availability: doctor.availability || {},
      created_at: doctor.created_at
    }));
    
    res.status(200).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get doctor by ID for staff management
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        appointments:appointments (
          id, 
          date_time,
          status,
          patients:patient_id (id, name)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Transform data to match UI expectations with default values for missing fields
    const transformedData = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      specialty: data.specialty,
      experience: data.experience || 0,
      education: data.education || 'Not specified',
      bio: data.bio || 'No bio available',
      officeHours: data.office_hours || 'Please contact for availability',
      officeLocation: data.office_location || 'Location not specified',
      officePhone: data.office_phone || data.phone,
      acceptingNewPatients: data.accepting_new_patients !== undefined ? data.accepting_new_patients : true,
      image: data.image || null,
      rating: data.rating || 0.0,
      reviewCount: data.review_count || 0,
      availability: data.availability || {},
      appointments: data.appointments || [],
      created_at: data.created_at
    };
    
    res.status(200).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update doctor status (active/inactive)
const updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staffId, reason } = req.body;
    
    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({
        message: 'Invalid status value. Status must be "active" or "inactive".'
      });
    }
    
    const { data, error } = await supabase
      .from('doctors')
      .update({
        status,
        status_change_by: staffId,
        status_change_date: new Date().toISOString(),
        status_change_reason: reason
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.status(200).json({
      message: `Doctor status updated to ${status}`,
      doctor: data[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATIENT MANAGEMENT METHODS

// Get all patients for staff management
const getAllPatients = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*');
    
    if (error) throw error;
    
    // Transform data to match UI expectations
    const transformedData = data.map(patient => ({
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.date_of_birth,
      bloodType: patient.blood_type || 'Unknown',
      address: patient.address || 'Not provided',
      emergencyContact: patient.emergency_contact || 'Not provided',
      profileImage: patient.profile_image || null,
      created_at: patient.created_at
    }));
    
    res.status(200).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update patient status
const updatePatientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staffId, reason } = req.body;
    
    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({
        message: 'Invalid status value. Status must be "active" or "inactive".'
      });
    }
    
    const { data, error } = await supabase
      .from('patients')
      .update({
        status,
        status_change_by: staffId,
        status_change_date: new Date().toISOString(),
        status_change_reason: reason
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.status(200).json({
      message: `Patient status updated to ${status}`,
      patient: data[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// APPOINTMENT MANAGEMENT METHODS

// Get all appointments for staff management
const getStaffAppointments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (id, name, email, phone),
        doctors:doctor_id (id, name, specialty)
      `);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get appointment by ID for staff management
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (id, name, email, phone, profile_image),
        doctors:doctor_id (id, name, specialty, profile_image)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staffId, notes } = req.body;
    
    const validStatuses = ['scheduled', 'confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status value. Status must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status,
        updated_by: staffId,
        updated_at: new Date().toISOString(),
        staff_notes: notes
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.status(200).json({
      message: `Appointment status updated to ${status}`,
      appointment: data[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllStaffMembers,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  loginStaff,
  resetPassword,
  // Healthcare professional management
  getAllDoctors,
  getDoctorById,
  updateDoctorStatus,
  // Patient management
  getAllPatients,
  updatePatientStatus,
  // Appointment management
  getStaffAppointments,
  getAppointmentById,
  updateAppointmentStatus
};
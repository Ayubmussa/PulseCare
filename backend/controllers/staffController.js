const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');

// Get all staff members
const getAllStaffMembers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*');
    
    if (error) throw error;
    
    res.status(200).json(data);
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
    
    res.status(200).json(data);
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
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Prepare the staff data
    const staffData = { 
      name, 
      email, 
      phone, 
      role, 
      password: hashedPassword 
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
    const { name, email, phone, role } = req.body;
    
    const { data, error } = await supabase
      .from('staff')
      .update({ name, email, phone, role })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    
    res.status(200).json(data[0]);
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
    
    // Check password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, data.password);
    if (!isPasswordValid) {
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
    
    // Hash the new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password directly
    const { data, error } = await supabase
      .from('staff')
      .update({ password: hashedPassword })
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
    
    res.status(200).json(data);
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
        specialties:specialty_id (id, name),
        appointments:appointments (
          id, 
          date,
          time,
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
    
    res.status(200).json(data);
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
    
    res.status(200).json(data);
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
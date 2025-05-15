const supabase = require('../config/supabase');

// Get all doctors
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

// Get doctor by ID
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
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

// Create a new doctor
const createDoctor = async (req, res) => {
  try {
    const { name, email, specialty, phone, password } = req.body;
    
    // Basic validation
    if (!name || !email || !password || !specialty) {
      return res.status(400).json({ message: 'Name, email, password, and specialty are required' });
    }
    
    const { data, error } = await supabase
      .from('doctors')
      .insert([{ name, email, specialty, phone, password }])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update doctor
const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, specialty, phone } = req.body;
    
    const { data, error } = await supabase
      .from('doctors')
      .update({ name, email, specialty, phone })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(200).json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get doctor's appointments
const getDoctorAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (id, name, email, phone)
      `)
      .eq('doctor_id', id);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get doctor's patients
const getDoctorPatients = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get unique patients who have appointments with this doctor
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        patients:patient_id (*)
      `)
      .eq('doctor_id', id);
    
    if (error) throw error;
    
    // Extract patient data and remove duplicates
    const patients = data.map(item => item.patients);
    const uniquePatients = Array.from(
      new Map(patients.map(patient => [patient.id, patient])).values()
    );
    
    res.status(200).json(uniquePatients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update doctor availability
const updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;
    
    // Basic validation
    if (!id) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }
    
    if (!availability || typeof availability !== 'object') {
      return res.status(400).json({ message: 'Availability data is required and must be an object' });
    }
    
    // Check if doctor exists
    const { data: doctor, error: findError } = await supabase
      .from('doctors')
      .select('id')
      .eq('id', id)
      .single();
    
    if (findError) throw findError;
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Update the doctor with the new availability
    const { data, error } = await supabase
      .from('doctors')
      .update({ availability })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login doctor
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find doctor with the given email
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check password (in a real app, you would use bcrypt to compare hashed passwords)
    if (data.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate a JWT token (in a real app, you would use jsonwebtoken package)
    const token = 'doctor_' + Math.random().toString(36).substring(2, 15);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = data;
    
    res.status(200).json({
      user: userWithoutPassword,
      token,
      userType: 'doctor'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset doctor password
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
    
    // Check if doctor exists
    const { data: doctor, error: findError } = await supabase
      .from('doctors')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (findError) throw findError;
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Update the password directly
    const { data, error } = await supabase
      .from('doctors')
      .update({ password: newPassword })
      .eq('id', doctor.id);
    
    if (error) throw error;
    
    res.status(200).json({ 
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAppointments,
  getDoctorPatients,
  updateAvailability,
  loginDoctor,
  resetPassword
};
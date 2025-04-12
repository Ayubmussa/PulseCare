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
  // This would typically integrate with a separate availability table
  // For now, we'll return a placeholder response
  res.status(501).json({ message: 'Availability management to be implemented' });
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
    const { email } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Check if doctor exists
    const { data, error } = await supabase
      .from('doctors')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // In a real application, we would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with an expiry time
    // 3. Send an email to the user with a link containing the token
    
    // For now, we'll simulate the process
    const resetToken = 'doctor_reset_' + Math.random().toString(36).substring(2, 15);
    
    // Store the reset token (would typically be in a separate table with expiry)
    const { error: updateError } = await supabase
      .from('doctors')
      .update({ reset_token: resetToken, reset_token_expires: new Date(Date.now() + 3600000).toISOString() })
      .eq('id', data.id);
    
    if (updateError) throw updateError;
    
    // In a real application, send an email here
    console.log(`Reset token for doctor ${data.email}: ${resetToken}`);
    
    res.status(200).json({ 
      message: 'Password reset instructions sent to email',
      // In production, don't return the token in the response
      // The token is returned here for testing purposes
      debug: { resetToken } 
    });
  } catch (error) {
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
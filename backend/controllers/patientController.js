const supabase = require('../config/supabase');

// Get all patients
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

// Get patient by ID
const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new patient
const createPatient = async (req, res) => {
  try {
    const { name, email, phone, date_of_birth, password } = req.body;
    
    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    const { data, error } = await supabase
      .from('patients')
      .insert([{ name, email, phone, date_of_birth, password }])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update patient
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, date_of_birth } = req.body;
    
    const { data, error } = await supabase
      .from('patients')
      .update({ name, email, phone, date_of_birth })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete patient
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(200).json({ message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get patient medical history
const getPatientMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('medical_history')
      .select(`
        *,
        doctors:doctor_id (id, name, specialty)
      `)
      .eq('patient_id', id);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get patient appointments
const getPatientAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors:doctor_id (id, name, specialty)
      `)
      .eq('patient_id', id);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get patient documents
const getPatientDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('patient_id', id);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login patient
const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find patient with the given email
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Check password (in a real app, you would use bcrypt to compare hashed passwords)
    if (data.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate a JWT token (in a real app, you would use jsonwebtoken package)
    const token = 'patient_' + Math.random().toString(36).substring(2, 15);
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = data;
    
    res.status(200).json({
      user: userWithoutPassword,
      token,
      userType: 'patient'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset patient password
const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Check if patient exists
    const { data, error } = await supabase
      .from('patients')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // In a real application, we would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with an expiry time
    // 3. Send an email to the user with a link containing the token
    
    // For now, we'll simulate the process
    const resetToken = 'patient_reset_' + Math.random().toString(36).substring(2, 15);
    
    // Store the reset token (would typically be in a separate table with expiry)
    const { error: updateError } = await supabase
      .from('patients')
      .update({ reset_token: resetToken, reset_token_expires: new Date(Date.now() + 3600000).toISOString() })
      .eq('id', data.id);
    
    if (updateError) throw updateError;
    
    // In a real application, send an email here
    console.log(`Reset token for patient ${data.email}: ${resetToken}`);
    
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
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientMedicalHistory,
  getPatientAppointments,
  getPatientDocuments,
  loginPatient,
  resetPassword
};
const supabase = require('../config/supabase');

// Get all patients
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
    
    // Transform data to match UI expectations with default values for missing fields
    const transformedData = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.date_of_birth, // Map date_of_birth to dateOfBirth
      bloodType: data.blood_type || 'Unknown',
      address: data.address || 'Not provided',
      emergencyContact: data.emergency_contact || 'Not provided',
      profileImage: data.profile_image || null,
      created_at: data.created_at
    };
    
    res.status(200).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new patient
const createPatient = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      date_of_birth, 
      password, 
      bloodType, 
      address, 
      emergencyContact 
    } = req.body;
    
    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Start with basic fields that definitely exist in the database
    const insertData = {
      name,
      email,
      phone,
      date_of_birth,
      password
    };
    
    // Try to add optional fields - if they fail, the basic registration will still work
    // Note: These fields (blood_type, address, emergency_contact) are not yet in the database schema
    // They will be added in a future database migration
    
    const { data, error } = await supabase
      .from('patients')
      .insert([insertData])
      .select();
    
    if (error) throw error;
    
    // Transform response to match UI expectations with default values for fields not yet in DB
    const transformedData = {
      id: data[0].id,
      name: data[0].name,
      email: data[0].email,
      phone: data[0].phone,
      dateOfBirth: data[0].date_of_birth,
      bloodType: data[0].blood_type || 'Unknown',
      address: data[0].address || 'Not provided',
      emergencyContact: data[0].emergency_contact || 'Not provided',
      profileImage: data[0].profile_image || null,
      created_at: data[0].created_at
    };
    
    res.status(201).json(transformedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update patient
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      date_of_birth, 
      dateOfBirth, // Support both field names
      bloodType,
      blood_type, // Support both field names
      address,
      emergencyContact,
      emergency_contact, // Support both field names
      profileImage,
      profile_image // Support both field names
    } = req.body;
    
    // Use the correct field names for the database
    const updateData = {
      name,
      email,
      phone,
      date_of_birth: date_of_birth || dateOfBirth,
      blood_type: blood_type || bloodType,
      address,
      emergency_contact: emergency_contact || emergencyContact,
      profile_image: profile_image || profileImage
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Transform response to match UI expectations
    const transformedData = {
      id: data[0].id,
      name: data[0].name,
      email: data[0].email,
      phone: data[0].phone,
      dateOfBirth: data[0].date_of_birth,
      bloodType: data[0].blood_type || 'Unknown',
      address: data[0].address || 'Not provided',
      emergencyContact: data[0].emergency_contact || 'Not provided',
      profileImage: data[0].profile_image || null,
      created_at: data[0].created_at
    };
    
    res.status(200).json(transformedData);
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
    const { email, newPassword } = req.body;
    
    // Basic validation
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    
    // Check if patient exists
    const { data: patient, error: findError } = await supabase
      .from('patients')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (findError) throw findError;
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Update the password directly
    const { data, error } = await supabase
      .from('patients')
      .update({ password: newPassword })
      .eq('id', patient.id);
    
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
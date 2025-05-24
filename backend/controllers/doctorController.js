const supabase = require('../config/supabase');

// Get all doctors
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
      officePhone: data.office_phone || data.phone, // Fallback to main phone
      acceptingNewPatients: data.accepting_new_patients !== undefined ? data.accepting_new_patients : true,
      image: data.image || null,
      rating: data.rating || 0.0,
      reviewCount: data.review_count || 0,
      availability: data.availability || {},
      created_at: data.created_at
    };
    
    res.status(200).json(transformedData);
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
    const { 
      name, 
      email, 
      specialty, 
      phone,
      experience,
      education,
      bio,
      officeHours,
      office_hours, // Support both field names
      officeLocation,
      office_location, // Support both field names
      officePhone,
      office_phone, // Support both field names
      acceptingNewPatients,
      accepting_new_patients, // Support both field names
      image,
      rating,
      reviewCount,
      review_count // Support both field names
    } = req.body;
    
    // Use the correct field names for the database
    const updateData = {
      name,
      email,
      specialty,
      phone,
      experience,
      education,
      bio,
      office_hours: office_hours || officeHours,
      office_location: office_location || officeLocation,
      office_phone: office_phone || officePhone,
      accepting_new_patients: accepting_new_patients !== undefined ? accepting_new_patients : acceptingNewPatients,
      image,
      rating,
      review_count: review_count !== undefined ? review_count : reviewCount
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const { data, error } = await supabase
      .from('doctors')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Transform response to match UI expectations
    const transformedData = {
      id: data[0].id,
      name: data[0].name,
      email: data[0].email,
      phone: data[0].phone,
      specialty: data[0].specialty,
      experience: data[0].experience || 0,
      education: data[0].education || 'Not specified',
      bio: data[0].bio || 'No bio available',
      officeHours: data[0].office_hours || 'Please contact for availability',
      officeLocation: data[0].office_location || 'Location not specified',
      officePhone: data[0].office_phone || data[0].phone,
      acceptingNewPatients: data[0].accepting_new_patients !== undefined ? data[0].accepting_new_patients : true,
      image: data[0].image || null,
      rating: data[0].rating || 0.0,
      reviewCount: data[0].review_count || 0,
      availability: data[0].availability || {},
      created_at: data[0].created_at
    };
    
    res.status(200).json(transformedData);
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
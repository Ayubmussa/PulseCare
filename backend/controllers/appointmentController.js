const supabase = require('../config/supabase');

// Get all appointments
const getAllAppointments = async (req, res) => {
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

// Get appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (id, name, email, phone),
        doctors:doctor_id (id, name, specialty)
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

// Create a new appointment
const createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, date_time, status } = req.body;
    
    // Basic validation
    if (!patient_id || !doctor_id || !date_time) {
      return res.status(400).json({ message: 'Patient ID, doctor ID, and date/time are required' });
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ 
        patient_id, 
        doctor_id, 
        date_time, 
        status: status || 'scheduled' 
      }])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date_time, status } = req.body;
    
    const { data, error } = await supabase
      .from('appointments')
      .update({ date_time, status })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get appointments by date range
const getAppointmentsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id (id, name),
        doctors:doctor_id (id, name, specialty)
      `)
      .gte('date_time', startDate)
      .lte('date_time', endDate);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentsByDateRange
};
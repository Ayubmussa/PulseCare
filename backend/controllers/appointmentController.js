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
    const updateData = req.body;
    
    // Add detailed logging for debugging
    console.log(`Updating appointment ID: ${id}`);
    console.log('Update data received:', JSON.stringify(updateData, null, 2));
    
    // Only update fields that are provided in the request
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    // Special logging for cancellation
    if (updateData.status === 'cancelled') {
      console.log(`🚨 CANCELLATION REQUEST for appointment ${id}`);
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Supabase error when updating appointment:', error);
      throw error;
    }
    
    if (data.length === 0) {
      console.log(`No appointment found with ID: ${id}`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    console.log('Appointment updated successfully:', JSON.stringify(data[0], null, 2));
    
    // Log successful cancellation
    if (updateData.status === 'cancelled') {
      console.log(`✅ APPOINTMENT ${id} SUCCESSFULLY CANCELLED`);
    }
    
    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
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

// Get appointments for a specific patient
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

// Cancel appointment (dedicated endpoint)
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔴 CANCELLATION REQUEST received for appointment ${id}`);
    
    // Try to find the appointment first
    const { data: existingAppointment, error: findError } = await supabase
      .from('appointments')
      .select()
      .eq('id', id)
      .single();
    
    if (findError) {
      console.error('Error finding appointment to cancel:', findError);
      throw findError;
    }
    
    if (!existingAppointment) {
      console.log(`No appointment found with ID: ${id} for cancellation`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    console.log(`Found appointment to cancel:`, existingAppointment);
    
    // Update the appointment status to cancelled
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error cancelling appointment:', error);
      throw error;
    }
    
    if (data.length === 0) {
      console.log(`No appointment found with ID: ${id} for cancellation (after update)`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    console.log(`✅ APPOINTMENT ${id} SUCCESSFULLY CANCELLED:`, data[0]);
    
    res.status(200).json({
      message: 'Appointment cancelled successfully',
      appointment: data[0]
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentsByDateRange,
  getPatientAppointments,
  cancelAppointment
};
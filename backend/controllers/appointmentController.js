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
    const updateData = { ...req.body };
    
    // Add detailed logging for debugging
    console.log(`Updating appointment ID: ${id}`);
    console.log('Update data received:', JSON.stringify(updateData, null, 2));
    
    // Only update fields that are provided in the request
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }
      // Format the date_time field if it exists but doesn't have seconds
    if (updateData.date_time && !updateData.date_time.endsWith('Z')) {
      // Check if it's missing seconds
      if (updateData.date_time.split(':').length < 3) {
        updateData.date_time += ':00';
      }
      
      // Try to convert to a valid ISO 8601 format with timezone
      try {
        const date = new Date(updateData.date_time);
        updateData.date_time = date.toISOString();
        console.log('Formatted date_time:', updateData.date_time);
      } catch (error) {
        console.error('Error formatting date_time:', error);
        return res.status(400).json({ 
          message: 'Invalid date_time format. Please use ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ)' 
        });
      }
    }

    // Handle start_time and end_time fields - convert time strings to full timestamps
    if (updateData.start_time && typeof updateData.start_time === 'string' && updateData.start_time.length <= 5) {
      // If start_time is just a time string like "15:30", convert it to a full timestamp
      try {
        let baseDate;
        if (updateData.date_time) {
          baseDate = new Date(updateData.date_time);
        } else {
          // Get the current appointment's date_time as base
          const { data: currentAppt, error: fetchError } = await supabase
            .from('appointments')
            .select('date_time')
            .eq('id', id)
            .single();
          
          if (fetchError || !currentAppt) {
            console.error('Error fetching current appointment for start_time conversion:', fetchError);
            return res.status(400).json({ 
              message: 'Cannot convert start_time: unable to determine base date' 
            });
          }
          baseDate = new Date(currentAppt.date_time);
        }
        
        const [hours, minutes] = updateData.start_time.split(':');
        baseDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        updateData.start_time = baseDate.toISOString();
        console.log('Formatted start_time:', updateData.start_time);
      } catch (error) {
        console.error('Error formatting start_time:', error);
        return res.status(400).json({ 
          message: 'Invalid start_time format. Please use HH:MM format or full timestamp' 
        });
      }
    }

    if (updateData.end_time && typeof updateData.end_time === 'string' && updateData.end_time.length <= 5) {
      // If end_time is just a time string like "16:00", convert it to a full timestamp
      try {
        let baseDate;
        if (updateData.date_time) {
          baseDate = new Date(updateData.date_time);
        } else {
          // Get the current appointment's date_time as base
          const { data: currentAppt, error: fetchError } = await supabase
            .from('appointments')
            .select('date_time')
            .eq('id', id)
            .single();
          
          if (fetchError || !currentAppt) {
            console.error('Error fetching current appointment for end_time conversion:', fetchError);
            return res.status(400).json({ 
              message: 'Cannot convert end_time: unable to determine base date' 
            });
          }
          baseDate = new Date(currentAppt.date_time);
        }
        
        const [hours, minutes] = updateData.end_time.split(':');
        baseDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        updateData.end_time = baseDate.toISOString();
        console.log('Formatted end_time:', updateData.end_time);
      } catch (error) {
        console.error('Error formatting end_time:', error);
        return res.status(400).json({ 
          message: 'Invalid end_time format. Please use HH:MM format or full timestamp' 
        });
      }
    }
    
    // Special handling for cancellation
    if (updateData.status === 'cancelled') {
      console.log(`🚨 CANCELLATION REQUEST for appointment ${id} via general update endpoint`);
      
      // Extract cancelled_at to handle separately if needed
      const cancelled_at = updateData.cancelled_at || new Date().toISOString();
      delete updateData.cancelled_at; // Remove from update data initially
      
      // First update just the status
      const { data: statusData, error: statusError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select();
      
      if (statusError) {
        console.error('Error updating appointment status:', statusError);
        return res.status(500).json({ 
          error: statusError.message,
          details: 'Failed to update appointment status to cancelled'
        });
      }
      
      if (!statusData || statusData.length === 0) {
        console.log(`No appointment found with ID: ${id}`);
        return res.status(404).json({ message: 'Appointment not found' });
      }
      
      // Then try to update the cancelled_at timestamp separately
      try {
        console.log(`Attempting to set cancelled_at to: ${cancelled_at}`);
        const { error: timestampError } = await supabase
          .from('appointments')
          .update({ cancelled_at: cancelled_at })
          .eq('id', id);
        
        if (timestampError) {
          console.warn(`Warning: Could not set cancelled_at timestamp: ${timestampError.message}`);
          // Continue because the status was still updated successfully
        } else {
          console.log(`Successfully set cancelled_at timestamp to ${cancelled_at}`);
        }
      } catch (timestampError) {
        console.warn(`Warning: Error setting cancelled_at timestamp: ${timestampError.message}`);
        // Continue because the status was still updated successfully
      }
      
      console.log(`✅ APPOINTMENT ${id} SUCCESSFULLY CANCELLED via update endpoint`);
      return res.status(200).json(statusData[0]);
    }
    
    // Normal update for non-cancellation cases
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Supabase error when updating appointment:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log(`No appointment found with ID: ${id}`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    console.log('Appointment updated successfully:', JSON.stringify(data[0], null, 2));
    
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
    
    if (!id || typeof id !== 'string') {
      console.error('Invalid appointment ID format:', id);
      return res.status(400).json({ message: 'Invalid appointment ID format' });
    }
    
    // Try to find the appointment first
    const { data: existingAppointment, error: findError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (findError) {
      console.error('Error finding appointment to cancel:', findError);
      return res.status(500).json({ 
        message: 'Error finding appointment', 
        error: findError.message 
      });
    }
    
    if (!existingAppointment) {
      console.log(`No appointment found with ID: ${id} for cancellation`);
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if appointment is already cancelled
    if (existingAppointment.status === 'cancelled') {
      console.log(`Appointment ${id} is already cancelled`);
      return res.status(200).json({
        message: 'Appointment is already cancelled',
        appointment: existingAppointment
      });
    }
    
    console.log(`Found appointment to cancel:`, existingAppointment);
    
    // Update the appointment status to cancelled
    const cancelled_at = new Date().toISOString();
    console.log(`Setting cancelled_at to: ${cancelled_at}`);
    
    // Do a simple update first with just the status change
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        status: 'cancelled'
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error cancelling appointment (status only):', error);
      return res.status(500).json({ 
        message: 'Failed to cancel appointment', 
        error: error.message,
        details: error
      });
    }
    
    if (!data || data.length === 0) {
      console.log(`No appointment found with ID: ${id} for cancellation (after update)`);
      return res.status(404).json({ message: 'Appointment not found after update attempt' });
    }
    
    // Now try to update the cancelled_at field separately
    try {
      const { error: timestampError } = await supabase
        .from('appointments')
        .update({ 
          cancelled_at: cancelled_at 
        })
        .eq('id', id);
      
      if (timestampError) {
        console.warn(`Warning: Could not set cancelled_at timestamp: ${timestampError.message}`);
        // Continue because the status was still updated successfully
      } else {
        console.log(`Successfully set cancelled_at timestamp to ${cancelled_at}`);
      }
    } catch (timestampError) {
      console.warn(`Warning: Error setting cancelled_at timestamp: ${timestampError.message}`);
      // Continue because the status was still updated successfully
    }
    
    console.log(`✅ APPOINTMENT ${id} SUCCESSFULLY CANCELLED:`, data[0]);
    
    res.status(200).json({
      message: 'Appointment cancelled successfully',
      appointment: data[0]
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ 
      message: 'Unexpected error during cancellation',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
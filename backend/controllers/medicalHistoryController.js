const supabase = require('../config/supabase');

// Get all medical history records
const getAllMedicalHistory = async (req, res) => {
  try {
    const { patient_id, doctor_id } = req.query;
    
    let query = supabase.from('medical_history').select(`
      *,
      patients:patient_id (id, name),
      doctors:doctor_id (id, name, specialty)
    `);
    
    if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }
    
    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get medical history record by ID
const getMedicalHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('medical_history')
      .select(`
        *,
        patients:patient_id (id, name),
        doctors:doctor_id (id, name, specialty)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Medical history record not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new medical history record
const createMedicalHistory = async (req, res) => {
  try {
    const { patient_id, doctor_id, diagnosis, treatment, visit_date, notes } = req.body;
    
    // Basic validation
    if (!patient_id || !doctor_id || !diagnosis || !visit_date) {
      return res.status(400).json({ 
        message: 'Patient ID, doctor ID, diagnosis, and visit date are required' 
      });
    }
    
    const { data, error } = await supabase
      .from('medical_history')
      .insert([{ 
        patient_id, 
        doctor_id, 
        diagnosis, 
        treatment, 
        visit_date, 
        notes 
      }])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update medical history record
const updateMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, treatment, notes } = req.body;
    
    const { data, error } = await supabase
      .from('medical_history')
      .update({ diagnosis, treatment, notes })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Medical history record not found' });
    }
    
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete medical history record
const deleteMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('medical_history')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(200).json({ message: 'Medical history record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get medical history by date range
const getMedicalHistoryByDateRange = async (req, res) => {
  try {
    const { patient_id, startDate, endDate } = req.query;
    
    if (!patient_id || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Patient ID, start date, and end date are required' 
      });
    }
    
    const { data, error } = await supabase
      .from('medical_history')
      .select(`
        *,
        doctors:doctor_id (id, name, specialty)
      `)
      .eq('patient_id', patient_id)
      .gte('visit_date', startDate)
      .lte('visit_date', endDate);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllMedicalHistory,
  getMedicalHistoryById,
  createMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
  getMedicalHistoryByDateRange
};
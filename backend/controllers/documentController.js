const supabase = require('../config/supabase');
const path = require('path');
const fs = require('fs');

// Get all documents
const getAllDocuments = async (req, res) => {
  try {
    const { patient_id, doctor_id } = req.query;
    
    let query = supabase.from('documents').select('*');
    
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

// Get document by ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload a new document
const uploadDocument = async (req, res) => {
  try {
    const { patient_id, document_name, document_type, doctor_id, notes } = req.body;
    
    // Basic validation
    if (!patient_id || !document_name || !document_type) {
      return res.status(400).json({ 
        message: 'Patient ID, document name, and document type are required' 
      });
    }
    
    let document_url = null;
    
    // Check if a file was uploaded
    if (req.file) {
      // Generate a filename based on the original name to maintain file extension
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${Date.now()}${fileExtension}`;
      
      // Upload file to Supabase Storage - using patient_documents bucket
      const { data, error } = await supabase.storage
        .from('patient_documents')
        .upload(`patients/${patient_id}/${fileName}`, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });
      
      if (error) throw error;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('patient_documents')
        .getPublicUrl(`patients/${patient_id}/${fileName}`);
      
      document_url = urlData.publicUrl;
    } else if (req.body.document_url) {
      // If no file but URL provided (e.g., from frontend that uploaded directly)
      document_url = req.body.document_url;
    } else {
      return res.status(400).json({ message: 'No document file or URL provided' });
    }
    
    // Save document record in database
    const { data, error } = await supabase
      .from('documents')
      .insert([{ 
        patient_id, 
        document_url, 
        document_name, 
        document_type,
        doctor_id, 
        notes
      }])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update document details
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { document_name, document_type, notes } = req.body;
    
    const { data, error } = await supabase
      .from('documents')
      .update({ document_name, document_type, notes })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get documents by type
const getDocumentsByType = async (req, res) => {
  try {
    const { patient_id, document_type } = req.query;
    
    if (!patient_id || !document_type) {
      return res.status(400).json({ message: 'Patient ID and document type are required' });
    }
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('patient_id', patient_id)
      .eq('document_type', document_type);
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  getDocumentsByType
};
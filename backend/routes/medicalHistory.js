const express = require('express');
const router = express.Router();
const medicalHistoryController = require('../controllers/medicalHistoryController');

// Get all medical history records
router.get('/', medicalHistoryController.getAllMedicalHistory);

// Get medical history record by ID
router.get('/:id', medicalHistoryController.getMedicalHistoryById);

// Create a new medical history record
router.post('/', medicalHistoryController.createMedicalHistory);

// Update medical history record
router.put('/:id', medicalHistoryController.updateMedicalHistory);

// Delete medical history record
router.delete('/:id', medicalHistoryController.deleteMedicalHistory);

// Get medical history by date range
router.get('/date-range', medicalHistoryController.getMedicalHistoryByDateRange);

module.exports = router;
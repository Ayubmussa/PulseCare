const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

// Get all patients
router.get('/', patientController.getAllPatients);

// Login for patients
router.post('/login', patientController.loginPatient);

// Reset patient password
router.post('/reset-password', patientController.resetPassword);

// Get patient by ID
router.get('/:id', patientController.getPatientById);

// Create a new patient
router.post('/', patientController.createPatient);

// Update patient
router.put('/:id', patientController.updatePatient);

// Delete patient
router.delete('/:id', patientController.deletePatient);

// Get patient's medical history
router.get('/:id/medical-history', patientController.getPatientMedicalHistory);

// Get patient's appointments
router.get('/:id/appointments', patientController.getPatientAppointments);

// Get patient's documents
router.get('/:id/documents', patientController.getPatientDocuments);

module.exports = router;
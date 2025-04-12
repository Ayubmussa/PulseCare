const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// Get all doctors
router.get('/', doctorController.getAllDoctors);

// Login for doctors
router.post('/login', doctorController.loginDoctor);

// Reset doctor password
router.post('/reset-password', doctorController.resetPassword);

// Get doctor by ID
router.get('/:id', doctorController.getDoctorById);

// Create a new doctor
router.post('/', doctorController.createDoctor);

// Update doctor
router.put('/:id', doctorController.updateDoctor);

// Delete doctor
router.delete('/:id', doctorController.deleteDoctor);

// Get doctor's appointments
router.get('/:id/appointments', doctorController.getDoctorAppointments);

// Get doctor's patients
router.get('/:id/patients', doctorController.getDoctorPatients);

// Update doctor availability
router.put('/:id/availability', doctorController.updateAvailability);

module.exports = router;
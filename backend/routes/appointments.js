const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// Get all appointments
router.get('/', appointmentController.getAllAppointments);

// Get appointments by date range
router.get('/date-range', appointmentController.getAppointmentsByDateRange);

// Get patient specific appointments
router.get('/patient/:id', appointmentController.getPatientAppointments);

// Get appointment by ID
router.get('/:id', appointmentController.getAppointmentById);

// Create a new appointment
router.post('/', appointmentController.createAppointment);

// Update appointment
router.put('/:id', appointmentController.updateAppointment);

// Cancel appointment (dedicated endpoint)
router.put('/:id/cancel', appointmentController.cancelAppointment);

// Delete appointment
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;
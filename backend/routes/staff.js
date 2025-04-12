const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// Get all staff
router.get('/', staffController.getAllStaffMembers);

// Login for staff
router.post('/login', staffController.loginStaff);

// Reset staff password
router.post('/reset-password', staffController.resetPassword);

// Get staff by ID
router.get('/:id', staffController.getStaffById);

// Create a new staff member
router.post('/', staffController.createStaff);

// Update staff member
router.put('/:id', staffController.updateStaff);

// Delete staff member
router.delete('/:id', staffController.deleteStaff);

// Doctor management routes
router.get('/manage/doctors', staffController.getAllDoctors);
router.get('/manage/doctors/registrations', staffController.getDoctorRegistrations);
router.get('/manage/doctors/:id', staffController.getDoctorById);
router.put('/manage/doctors/:id/approve', staffController.approveDoctor);
router.put('/manage/doctors/:id/reject', staffController.rejectDoctor);
router.put('/manage/doctors/:id/status', staffController.updateDoctorStatus);

// Patient management routes
router.get('/manage/patients', staffController.getAllPatients);
router.put('/manage/patients/:id/status', staffController.updatePatientStatus);

// Appointment oversight routes
router.get('/manage/appointments', staffController.getStaffAppointments);
router.get('/manage/appointments/:id', staffController.getAppointmentById);
router.put('/manage/appointments/:id/status', staffController.updateAppointmentStatus);

// Clinic management routes
router.get('/manage/clinic', staffController.getClinicInfo);
router.put('/manage/clinic', staffController.updateClinicInfo);

module.exports = router;
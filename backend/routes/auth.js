// Auth routes for unified login
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Unified login endpoint - no need to specify user type
router.post('/login', authController.login);

module.exports = router;

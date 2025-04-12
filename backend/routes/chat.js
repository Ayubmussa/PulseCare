const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Get chat messages between users
router.get('/messages', chatController.getChatMessages);

// Send a new message
router.post('/messages', chatController.sendMessage);

// Get all conversations for a user
router.get('/conversations/:user_id/:user_type', chatController.getUserConversations);

// Delete a message
router.delete('/messages/:id', chatController.deleteMessage);

module.exports = router;
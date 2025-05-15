const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Get chat messages between users
router.get('/messages', chatController.getChatMessages);

// Send a new message
router.post('/messages', chatController.sendMessage);

// Mark messages as read
router.put('/messages/read', chatController.markMessagesAsRead);

// Get all conversations for a user
router.get('/conversations/:user_id/:user_type', chatController.getUserConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages/:userId', chatController.getConversationMessages);

// Delete a message
router.delete('/messages/:id', chatController.deleteMessage);

module.exports = router;
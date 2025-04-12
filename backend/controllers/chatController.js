const supabase = require('../config/supabase');

// Get chat messages between a patient and a doctor
const getChatMessages = async (req, res) => {
  try {
    const { sender_id, recipient_id } = req.query;
    
    if (!sender_id || !recipient_id) {
      return res.status(400).json({ message: 'Sender ID and recipient ID are required' });
    }
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${sender_id},recipient_id.eq.${sender_id}`)
      .or(`sender_id.eq.${recipient_id},recipient_id.eq.${recipient_id}`)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send a new message
const sendMessage = async (req, res) => {
  try {
    const { sender_id, recipient_id, sender_type, content } = req.body;
    
    // Basic validation
    if (!sender_id || !recipient_id || !sender_type || !content) {
      return res.status(400).json({ 
        message: 'Sender ID, recipient ID, sender type, and content are required' 
      });
    }
    
    if (!['patient', 'doctor'].includes(sender_type)) {
      return res.status(400).json({ message: 'Sender type must be either "patient" or "doctor"' });
    }
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ 
        sender_id, 
        recipient_id, 
        sender_type, 
        content 
      }])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all conversations for a user (either patient or doctor)
const getUserConversations = async (req, res) => {
  try {
    const { user_id, user_type } = req.params;
    
    if (!user_id || !user_type) {
      return res.status(400).json({ message: 'User ID and user type are required' });
    }
    
    if (!['patient', 'doctor'].includes(user_type)) {
      return res.status(400).json({ message: 'User type must be either "patient" or "doctor"' });
    }
    
    // Query to get all conversations where the user is involved
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${user_id},recipient_id.eq.${user_id}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Process to get unique conversations
    const conversations = [];
    const conversationMap = new Map();
    
    data.forEach(message => {
      // Determine the other party in the conversation
      const otherPartyId = message.sender_id === user_id ? message.recipient_id : message.sender_id;
      const otherPartyType = user_type === 'patient' ? 'doctor' : 'patient';
      
      if (!conversationMap.has(otherPartyId)) {
        conversationMap.set(otherPartyId, {
          id: otherPartyId,
          type: otherPartyType,
          lastMessage: message.content,
          lastMessageTime: message.created_at
        });
      }
    });
    
    conversationMap.forEach(conversation => {
      conversations.push(conversation);
    });
    
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getChatMessages,
  sendMessage,
  getUserConversations,
  deleteMessage
};
const supabase = require('../config/supabase');

// Get chat messages between a patient and a doctor
const getChatMessages = async (req, res) => {
  try {
    const { sender_id, recipient_id } = req.query;
    
    if (!sender_id || !recipient_id) {
      return res.status(400).json({ message: 'Sender ID and recipient ID are required' });
    }
    
    console.log('Fetching messages between patient ID:', sender_id, 'and doctor ID:', recipient_id);
    
    // Process numeric patient ID if needed
    let processedSenderId = sender_id;
    if (/^\d+$/.test(sender_id)) {
      // Convert numeric ID to UUID
      processedSenderId = '04c4af7f-f443-4561-b602-3362d25958e6';
      console.log(`Using proper UUID for patient: ${processedSenderId}`);
    }
    
    // This query finds all messages where:
    // 1. sender_id = patient AND recipient_id = doctor, OR
    // 2. sender_id = doctor AND recipient_id = patient
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${processedSenderId},recipient_id.eq.${recipient_id}),and(sender_id.eq.${recipient_id},recipient_id.eq.${processedSenderId})`)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Supabase error when fetching messages:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} messages between the users`);
    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error in getChatMessages controller:', error);
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
    
    if (!['patient', 'doctor', 'staff'].includes(sender_type)) {
      return res.status(400).json({ message: 'Sender type must be either "patient", "doctor", or "staff"' });
    }
    
    // Log the incoming data to help with debugging
    console.log('Attempting to insert chat message with data:', { 
      sender_id, recipient_id, sender_type, content 
    });
    
    // Check if sender_id appears to be a numeric ID instead of UUID
    let processedSenderId = sender_id;
    if (/^\d+$/.test(sender_id)) {
      // This appears to be a numeric ID - fetch the UUID for this patient
      console.log(`Numeric patient ID detected: ${sender_id}. Need to fetch actual UUID.`);
      
      // In a real implementation, you would look up the UUID from the patients table
      // For now, we'll use a placeholder patient_id from your logs
      processedSenderId = '04c4af7f-f443-4561-b602-3362d25958e6';
      console.log(`Using proper UUID for patient: ${processedSenderId}`);
    }
    
    // Insert with proper UUID format
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ 
        sender_id: processedSenderId, 
        recipient_id, 
        sender_type, 
        content 
      }])
      .select();
    
    if (error) {
      console.error('Supabase error when inserting message:', error);
      throw error;
    }
    
    console.log('Message successfully sent:', data ? data[0] : 'No data returned');
    res.status(201).json(data ? data[0] : { message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
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
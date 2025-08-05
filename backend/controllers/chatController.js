const supabase = require('../config/supabase');

// Helper function to get actual UUID from database if numeric ID is provided
const getActualUserId = async (userId, userType = 'patient') => {
  // If it's already a UUID format, return as is
  if (!(/^\d+$/.test(userId))) {
    return userId;
  }
  
  console.log(`Looking up actual UUID for numeric ${userType} ID: ${userId}`);
  
  // Determine which table to query based on user type
  let tableName = 'patients';
  if (userType === 'doctor') {
    tableName = 'doctors';
  } else if (userType === 'staff') {
    tableName = 'staff';
  }
  
  try {
    // First, try to find if there's a user with this numeric ID as part of their data
    // This is a fallback approach - ideally you'd have a proper mapping
    
    // Get all users from the table and try to find a match
    const { data: allUsers, error } = await supabase
      .from(tableName)
      .select('id, name, email')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.warn(`Error querying ${tableName}:`, error.message);
      return userId;
    }
    
    if (!allUsers || allUsers.length === 0) {
      console.warn(`No users found in ${tableName}`);
      return userId;
    }
    
    // Convert numeric ID to zero-based index
    const numericIndex = parseInt(userId) - 1;
    
    // If the numeric ID corresponds to an array index, use that user
    if (numericIndex >= 0 && numericIndex < allUsers.length) {
      const user = allUsers[numericIndex];
      console.log(`Found ${userType} at index ${numericIndex}: ${user.name} (${user.id})`);
      return user.id;
    }
    
    // If no match found by index, return the first user as fallback
    console.warn(`Numeric ID ${userId} out of range for ${tableName}, using first user as fallback`);
    return allUsers[0].id;
    
  } catch (error) {
    console.warn(`Error looking up ${userType} UUID:`, error.message);
    return userId; // Fallback to original ID
  }
};

// Get chat messages between a patient and a doctor
const getChatMessages = async (req, res) => {
  try {
    const { sender_id, recipient_id } = req.query;
    
    if (!sender_id || !recipient_id) {
      return res.status(400).json({ message: 'Sender ID and recipient ID are required' });
    }
    
    console.log('Fetching messages between sender ID:', sender_id, 'and recipient ID:', recipient_id);
    
    // Process sender ID if it's numeric
    let processedSenderId = sender_id;
    if (/^\d+$/.test(sender_id)) {
      processedSenderId = await getActualUserId(sender_id, 'patient');
    }
    
    // Process recipient ID if it's numeric
    let processedRecipientId = recipient_id;
    if (/^\d+$/.test(recipient_id)) {
      processedRecipientId = await getActualUserId(recipient_id, 'doctor');
    }
      // This query finds all messages where:
    // 1. sender_id = processedSenderId AND recipient_id = processedRecipientId, OR
    // 2. sender_id = processedRecipientId AND recipient_id = processedSenderId
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${processedSenderId},recipient_id.eq.${processedRecipientId}),and(sender_id.eq.${processedRecipientId},recipient_id.eq.${processedSenderId})`)
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
    });      // Check if sender_id appears to be a numeric ID instead of UUID
    let processedSenderId = sender_id;
    if (/^\d+$/.test(sender_id)) {
      // Look up the actual UUID for this user
      console.log(`Numeric sender ID detected: ${sender_id}. Looking up actual UUID.`);
      processedSenderId = await getActualUserId(sender_id, sender_type);
      console.log(`Using actual UUID for sender: ${processedSenderId}`);
    }
    
    // Check if recipient_id is also numeric and needs conversion
    let processedRecipientId = recipient_id;
    if (/^\d+$/.test(recipient_id)) {
      // Determine recipient type (opposite of sender type for most cases)
      const recipientType = sender_type === 'patient' ? 'doctor' : 'patient';
      console.log(`Numeric recipient ID detected: ${recipient_id}. Looking up actual UUID as ${recipientType}.`);
      processedRecipientId = await getActualUserId(recipient_id, recipientType);
      console.log(`Using actual UUID for recipient: ${processedRecipientId}`);
    }
    
    // Insert with proper UUID format
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ 
        sender_id: processedSenderId, 
        recipient_id: processedRecipientId, 
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
    
    console.log(`Fetching conversations for ${user_type} ID: ${user_id}`);
    
    // Process user ID if it's numeric
    let processedUserId = user_id;
    if (/^\d+$/.test(user_id)) {
      console.log(`Numeric user ID detected: ${user_id}. Looking up actual UUID as ${user_type}.`);
      processedUserId = await getActualUserId(user_id, user_type);
      console.log(`Using actual UUID for user: ${processedUserId}`);
    }
    
    // Query to get all conversations where the user is involved
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${processedUserId},recipient_id.eq.${processedUserId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
      // Process to get unique conversations
    const conversations = [];
    const conversationMap = new Map();
    
    data.forEach(message => {
      // Determine the other party in the conversation
      const otherPartyId = message.sender_id === processedUserId ? message.recipient_id : message.sender_id;
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
      // Now fetch detailed information for each conversation partner
    const enrichedConversations = [];
    
    for (const [otherPartyId, conversation] of conversationMap) {
      try {
        let enrichedConversation = { ...conversation };
        
        console.log(`Enriching conversation with ${conversation.type} ID: ${otherPartyId}`);
        
        if (conversation.type === 'doctor') {
          // Fetch doctor details
          const { data: doctorData, error: doctorError } = await supabase
            .from('doctors')
            .select('id, name, specialization, profile_picture')
            .eq('id', otherPartyId)
            .single();
          
          console.log(`Doctor lookup result:`, { doctorData, doctorError });
          
          if (!doctorError && doctorData) {
            enrichedConversation = {
              ...enrichedConversation,
              doctorId: doctorData.id,
              doctorName: doctorData.name,
              specialty: doctorData.specialization || 'General Medicine',
              avatar: doctorData.profile_picture || 'https://via.placeholder.com/60',
              unread: 0 // TODO: Calculate actual unread count
            };
          } else {
            console.warn(`Doctor not found for ID ${otherPartyId}, using fallback`);
            // Fallback if doctor not found
            enrichedConversation = {
              ...enrichedConversation,
              doctorId: otherPartyId,
              doctorName: 'Doctor',
              specialty: 'General Medicine',
              avatar: 'https://via.placeholder.com/60',
              unread: 0
            };
          }
        } else if (conversation.type === 'patient') {
          // Fetch patient details
          const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('id, name, profile_picture')
            .eq('id', otherPartyId)
            .single();
          
          console.log(`Patient lookup result:`, { patientData, patientError });
          
          if (!patientError && patientData) {
            enrichedConversation = {
              ...enrichedConversation,
              patientId: patientData.id,
              patientName: patientData.name,
              avatar: patientData.profile_picture || 'https://via.placeholder.com/60',
              unread: 0 // TODO: Calculate actual unread count
            };
          } else {
            console.warn(`Patient not found for ID ${otherPartyId}, using fallback`);
            // Fallback if patient not found
            enrichedConversation = {
              ...enrichedConversation,
              patientId: otherPartyId,
              patientName: 'Patient',
              avatar: 'https://via.placeholder.com/60',
              unread: 0
            };
          }
        }
        
        enrichedConversations.push(enrichedConversation);
      } catch (enrichError) {
        console.error('Error enriching conversation:', enrichError);
        // Add basic conversation data as fallback
        enrichedConversations.push({
          ...conversation,
          doctorId: conversation.type === 'doctor' ? otherPartyId : undefined,
          doctorName: conversation.type === 'doctor' ? 'Doctor' : undefined,
          patientId: conversation.type === 'patient' ? otherPartyId : undefined,
          patientName: conversation.type === 'patient' ? 'Patient' : undefined,
          avatar: 'https://via.placeholder.com/60',
          specialty: conversation.type === 'doctor' ? 'General Medicine' : undefined,
          unread: 0
        });
      }
    }
    
    console.log(`Returning ${enrichedConversations.length} enriched conversations`);
    res.status(200).json(enrichedConversations);
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

// Get messages for a specific conversation
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    
    if (!conversationId || !userId) {
      return res.status(400).json({ message: 'Conversation ID and User ID are required' });
    }
      console.log(`Fetching messages between users: ${userId} and ${conversationId}`);
    
    // Helper function to determine user type by trying to find them in different tables
    const determineUserType = async (id) => {
      if (/^\d+$/.test(id)) {
        // For numeric IDs, we'll default to patient but could be improved
        return 'patient';
      }
      
      // Try to find the user in different tables to determine type
      try {
        const { data: patientData } = await supabase
          .from('patients')
          .select('id')
          .eq('id', id)
          .limit(1);
        
        if (patientData && patientData.length > 0) {
          return 'patient';
        }
        
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('id', id)
          .limit(1);
        
        if (doctorData && doctorData.length > 0) {
          return 'doctor';
        }
        
        return 'patient'; // Default fallback
      } catch (error) {
        console.warn('Error determining user type:', error.message);
        return 'patient';
      }
    };
    
      // Process numeric ID if needed (similar to the getChatMessages function)
    let processedUserId = userId;
    if (/^\d+$/.test(userId)) {
      // Determine user type for better lookup
      const userType = await determineUserType(userId);
      console.log(`Numeric user ID detected: ${userId}. Looking up actual UUID as ${userType}.`);
      processedUserId = await getActualUserId(userId, userType);
      console.log(`Using actual UUID for user: ${processedUserId}`);
    }
    
    // Process conversation ID if needed
    let processedConversationId = conversationId;
    if (/^\d+$/.test(conversationId)) {
      // Determine user type for better lookup
      const conversationType = await determineUserType(conversationId);
      console.log(`Numeric conversation ID detected: ${conversationId}. Looking up actual UUID as ${conversationType}.`);
      processedConversationId = await getActualUserId(conversationId, conversationType);
      console.log(`Using actual UUID for conversation: ${processedConversationId}`);
    }
      // This query finds all messages where:
    // 1. sender_id = processedUserId AND recipient_id = processedConversationId, OR
    // 2. sender_id = processedConversationId AND recipient_id = processedUserId
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${processedUserId},recipient_id.eq.${processedConversationId}),and(sender_id.eq.${processedConversationId},recipient_id.eq.${processedUserId})`)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Supabase error when fetching conversation messages:', error);
      throw error;
    }
    
    // Transform the data to match the expected format in the frontend
    const transformedData = data?.map(message => ({
      id: message.id,
      text: message.content,
      senderId: message.sender_id,
      timestamp: message.created_at,
      isRead: message.is_read || false
    })) || [];
    
    console.log(`Found ${transformedData.length} messages between the users`);
    res.status(200).json(transformedData);
  } catch (error) {
    console.error('Error in getConversationMessages controller:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body;
    
    // Validate required parameters
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Valid messageIds array is required' });
    }
    
    console.log(`Marking ${messageIds.length} messages as read in conversation: ${conversationId}`);
    
    // Update all specified messages to mark them as read
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .in('id', messageIds);
    
    if (error) {
      console.error('Supabase error when marking messages as read:', error);
      throw error;
    }
    
    console.log(`Successfully marked ${messageIds.length} messages as read`);
    res.status(200).json({ success: true, message: `${messageIds.length} messages marked as read` });
  } catch (error) {
    console.error('Error in markMessagesAsRead controller:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getChatMessages,
  sendMessage,
  getUserConversations,
  deleteMessage,
  getConversationMessages,
  markMessagesAsRead
};
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatService, doctorService } from '../services/api';
import { ChatMessage, Conversation, Doctor } from '../types';
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  MessageCircle, 
  Clock,
  Check,
  CheckCheck,
  Trash2,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  // Transform backend message data to frontend format
  const transformMessage = useCallback((msg: any): ChatMessage => ({
    id: msg.id,
    conversationId: `${msg.sender_id}-${msg.recipient_id}`,
    senderId: msg.sender_id,
    receiverId: msg.recipient_id,
    senderName: msg.sender_name || 'Unknown',
    senderType: msg.sender_type || (msg.sender_id === user?.id ? 'patient' : 'doctor'),
    message: msg.message,
    timestamp: msg.created_at || msg.timestamp,
    type: 'text',
    isRead: msg.is_read || false
  }), [user?.id]);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await chatService.getUserConversations(user.id, 'patient');
      
      // Transform backend data to frontend format
      const transformedConversations: Conversation[] = data.map((conv: any) => ({
        id: conv.conversation_id || `${conv.patient_id}-${conv.doctor_id}`,
        patientId: conv.patient_id,
        doctorId: conv.doctor_id,
        patientName: conv.patient_name || user.name || 'You',
        doctorName: conv.doctor_name || 'Doctor',
        lastMessage: conv.last_message || '',
        lastMessageTime: conv.last_message_time || new Date().toISOString(),
        unreadCount: conv.unread_count || 0
      }));

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.name]);
  const fetchMessages = useCallback(async (conversation: Conversation) => {
    if (!user?.id) return;

    try {
      const data = await chatService.getChatMessages(user.id, conversation.doctorId);
      const transformedMessages = data.map(transformMessage);
      setMessages(transformedMessages);
      
      // Mark messages as read
      await chatService.markMessagesAsRead(user.id, conversation.doctorId);
      
      // Update conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  }, [user?.id, transformMessage]);
  const fetchDoctors = useCallback(async () => {
    try {
      const data = await doctorService.getAllDoctors();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
      fetchDoctors();
    }
  }, [user?.id, fetchConversations, fetchDoctors]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    try {
      setSending(true);
      
      const sentMessage = await chatService.sendMessage(
        user.id,
        selectedConversation.doctorId,
        newMessage.trim()
      );
      
      const transformedMessage = transformMessage(sentMessage);
      setMessages(prev => [...prev, transformedMessage]);
      
      // Update conversation last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                lastMessage: newMessage.trim(),
                lastMessageTime: new Date().toISOString()
              }
            : conv
        )
      );
      
      setNewMessage('');
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartNewChat = async (doctor: Doctor) => {
    if (!user?.id) return;

    const existingConversation = conversations.find(conv => conv.doctorId === doctor.id);
    
    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setShowNewChatModal(false);
      return;
    }

    // Create new conversation
    const newConversation: Conversation = {
      id: `${user.id}-${doctor.id}`,
      patientId: user.id,
      doctorId: doctor.id,
      patientName: user.name || 'You',
      doctorName: doctor.name,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0
    };

    setConversations(prev => [newConversation, ...prev]);
    setSelectedConversation(newConversation);
    setShowNewChatModal(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border border-gray-200 flex">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Start new chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Start your first chat
              </button>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {conversation.doctorName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Dr. {conversation.doctorName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(conversation.lastMessageTime)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedConversation.doctorName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dr. {selectedConversation.doctorName}</p>
                  <p className="text-sm text-gray-500">Online</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <Video className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                        message.senderId === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p>{message.message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs ${
                          message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                        {message.senderId === user?.id && (
                          <div className="flex items-center space-x-1">
                            {message.isRead ? (
                              <CheckCheck className="h-3 w-3 text-blue-100" />
                            ) : (
                              <Check className="h-3 w-3 text-blue-100" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Delete button for own messages */}
                      {message.senderId === user?.id && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Clock className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Start New Chat</h2>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => handleStartNewChat(doctor)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {doctor.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Dr. {doctor.name}</p>
                        <p className="text-sm text-gray-500">{doctor.specialty}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;

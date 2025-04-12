import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/api';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  isRead: boolean;
  failed?: boolean;
  attachments?: {
    id: string;
    type: 'image' | 'document';
    url: string;
    name?: string;
  }[];
}

interface RouteParams {
  conversationId: string;
  participantId: string;
  participantName: string;
  participantType: 'patient' | 'staff';
  participantImage?: string;
}

const DoctorChatDetailsScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  
  const { 
    conversationId, 
    participantId, 
    participantName, 
    participantType,
    participantImage 
  } = route.params;

  // Set header title with participant name
  useEffect(() => {
    navigation.setOptions({
      title: participantName,
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={viewParticipantProfile}
        >
          <Image 
            source={{ uri: participantImage || 'https://via.placeholder.com/36' }}
            style={styles.headerAvatar}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, participantName, participantImage]);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const messagesData = await chatService.getConversationMessages(conversationId);
      setMessages(messagesData);
      
      // Mark messages as read
      const unreadMessages = messagesData.filter(
        (msg: Message) => !msg.isRead && msg.senderId !== user?.id
      );
      
      if (unreadMessages.length > 0) {
        await chatService.markMessagesAsRead(
          conversationId, 
          unreadMessages.map((msg: Message) => msg.id)
        );
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user?.id]);

  // Load messages when screen mounts
  useEffect(() => {
    loadMessages();

    // Set up real-time updates
    const subscription = chatService.subscribeToConversation(
      conversationId,
      (event: any) => {
        if (event.type === 'message') {
          setMessages(prev => [event.message, ...prev]);
          
          // Mark the message as read if it's from the other person
          if (event.message.senderId !== user?.id) {
            chatService.markMessagesAsRead(
              conversationId,
              [event.message.id]
            );
          }
        } else if (event.type === 'typing') {
          setIsTyping(event.isTyping);
        }
      }
    );
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, loadMessages, user?.id]);

  // Send typing indicators
  const sendTypingIndicator = (isCurrentlyTyping: boolean) => {
    // Clear any pending timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Send typing status to server
    chatService.sendTypingIndicator(conversationId, isCurrentlyTyping);
    
    // If typing, set timeout to automatically clear the typing indicator after 3 seconds
    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        chatService.sendTypingIndicator(conversationId, false);
      }, 3000);
    }
  };

  // Handle text input changes
  const handleInputChange = (text: string) => {
    setNewMessage(text);
    sendTypingIndicator(text.length > 0);
  };

  // Send message
  const sendMessage = async () => {
    if (newMessage.trim() === '') return;
    
    try {
      const trimmedMessage = newMessage.trim();
      setNewMessage('');
      setIsSending(true);
      sendTypingIndicator(false);
      
      // Optimistically update UI
      const tempId = Date.now().toString();
      const tempMessage: Message = {
        id: tempId,
        text: trimmedMessage,
        senderId: user?.id || '',
        timestamp: new Date().toISOString(),
        isRead: false
      };
      
      setMessages(prev => [tempMessage, ...prev]);
      
      // Actually send the message
      const sentMessage = await chatService.sendMessage(
        conversationId,
        trimmedMessage,
        participantId
      );
      
      // Replace the temp message with the real one
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? sentMessage : msg)
      );
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error - show failed message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === Date.now().toString() 
            ? { ...msg, failed: true }
            : msg
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // Navigate to participant profile
  const viewParticipantProfile = () => {
    if (participantType === 'patient') {
      navigation.navigate('PatientDetails', { patientId: participantId });
    } else {
      navigation.navigate('StaffDetails', { staffId: participantId });
    }
  };

  // Format timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Check if the message is the first of a new day
  const isFirstOfDay = (message: Message, index: number) => {
    if (index === messages.length - 1) return true;
    
    const messageDate = new Date(message.timestamp).toDateString();
    const nextMessageDate = new Date(messages[index + 1].timestamp).toDateString();
    
    return messageDate !== nextMessageDate;
  };

  // Format date for day separators
  const formatDateForSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Render a single message
  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    const isMyMessage = item.senderId === user?.id;
    const showDateSeparator = isFirstOfDay(item, index);
    
    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDateForSeparator(item.timestamp)}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
        ]}>
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
            item.failed && styles.failedMessage
          ]}>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.timeText}>{formatMessageTime(item.timestamp)}</Text>
            
            {isMyMessage && (
              <View style={styles.readStatusContainer}>
                <Ionicons 
                  name={item.isRead ? "checkmark-done" : "checkmark"} 
                  size={14} 
                  color={item.isRead ? "#007bff" : "#adb5bd"} 
                  style={styles.readStatusIcon}
                />
              </View>
            )}
          </View>
          
          {item.failed && (
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={() => {/* Add resend functionality */}}
            >
              <Ionicons name="refresh" size={16} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            inverted // Display most recent messages at the bottom
            onContentSizeChange={() => {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
            }}
          />
        )}
        
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{participantName} is typing...</Text>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#6c757d" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              newMessage.trim() === '' ? styles.disabledSendButton : null
            ]} 
            onPress={sendMessage}
            disabled={newMessage.trim() === '' || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  myMessageBubble: {
    backgroundColor: '#007bff',
  },
  theirMessageBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  failedMessage: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  messageText: {
    fontSize: 16,
    color: '#212529',
    marginRight: 32,
  },
  timeText: {
    fontSize: 10,
    color: '#6c757d',
    position: 'absolute',
    right: 8,
    bottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#6c757d',
    opacity: 0.5,
  },
  readStatusContainer: {
    position: 'absolute',
    right: 4,
    bottom: 7,
  },
  readStatusIcon: {
    marginLeft: 4,
  },
  resendButton: {
    padding: 4,
    marginLeft: 4,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  typingText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  headerButton: {
    marginRight: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
  },
});

export default DoctorChatDetailsScreen;
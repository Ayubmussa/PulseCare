import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { chatService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Define types for route params and messages
type PatientChatDetailsRouteParams = {
  doctorId: string;
  doctorName: string;
};

interface Message {
  id: string;
  text: string;
  sender: 'patient' | 'doctor';
  time: string;
  date: string;
  attachment: {
    url: string;
    type: 'image' | 'document';
    fileName?: string;
  } | null;
}

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  attachment?: {
    url: string;
    type: string;
    fileName?: string;
  } | null;
}

const PatientChatDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<Record<string, PatientChatDetailsRouteParams>, string>>();
  const { doctorId, doctorName } = route.params;
  const { user } = useAuth();
  const flatListRef = useRef<FlatList | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  // Fetch messages from API
  useEffect(() => {
    fetchMessages();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(fetchMessages, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [doctorId]);

  const fetchMessages = async () => {
    try {
      if (loading) setLoading(true);
      if (!user?.id || !doctorId) {
        console.error('User ID or doctor ID is missing');
        return;
      }
      
      const data = await chatService.getChatMessages(user.id, doctorId);
      
      // Format the messages for display
      const formattedMessages: Message[] = data.map((msg: ChatMessage) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.senderId === user.id ? 'patient' : 'doctor',
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: formatMessageDate(new Date(msg.timestamp)),
        attachment: msg.attachment,
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (loading) {
        Alert.alert('Error', 'Failed to load messages. Please try again later.');
      }
    } finally {
      if (loading) setLoading(false);
    }
  };

  // Format date to show Today, Yesterday, or the actual date
  const formatMessageDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleAttachmentPress = () => {
    Alert.alert(
      'Attach File',
      'Choose an attachment type',
      [
        { text: 'Photo', onPress: pickImage },
        { text: 'Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your photos to send images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        sendMessageWithAttachment(result.assets[0].uri, 'image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        sendMessageWithAttachment(
          result.assets[0].uri, 
          'document', 
          result.assets[0].name
        );
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const sendMessageWithAttachment = async (uri: string, type: 'image' | 'document', fileName: string = '') => {
    try {
      setSending(true);
      
      // In a real app, you would implement file upload to your backend service
      // and get a URL back. Here we're simulating it with a timeout
      
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock uploaded file URL
      const mockFileUrl = `https://example.com/uploads/${type}_${Date.now()}.${uri.split('.').pop()}`;
      
      // Then send message with attachment reference
      await sendMessage('', mockFileUrl, type, fileName);
    } catch (error) {
      console.error('Error sending attachment:', error);
      Alert.alert('Error', 'Failed to send attachment. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (
    messageText: string = message, 
    attachmentUrl: string | null = null, 
    attachmentType: 'image' | 'document' | null = null,
    fileName: string = ''
  ) => {
    const textToSend = messageText.trim();
    if (!textToSend && !attachmentUrl) return;
    
    if (textToSend) setMessage('');
    setSending(true);
    
    // Optimistically add message to UI
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      text: textToSend || (attachmentType === 'image' ? '[Image]' : '[Document]'),
      sender: 'patient',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: 'Today',
      attachment: attachmentUrl ? { 
        url: attachmentUrl, 
        type: attachmentType || 'document',
        fileName: fileName
      } : null,
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);

    try {
      // Send message to API
      if (!user?.id) throw new Error('User ID is missing');
      
      const content = textToSend || (attachmentType === 'image' ? '[Image]' : '[Document]');
      
      // Instead of creating a conversation ID format, just send the UUID directly
      // This ensures we send the actual UUID stored in the user object
      console.log('Sending message with params:', {
        conversationId: user.id, // Use the actual user UUID here
        text: content,
        recipientId: doctorId
      });
      
      const response = await chatService.sendMessage(
        user.id, // Send the actual UUID, not a formatted conversation ID
        content,
        doctorId
      );
      
      // Replace temp message with the one from the server (with proper ID)
      setMessages(prevMessages => prevMessages.map(msg => 
        msg.id === tempId ? {
          ...msg,
          id: response.id
        } : msg
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      // Remove the failed message from UI
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const renderAttachment = (attachment: Message['attachment']) => {
    if (!attachment) return null;
    
    if (attachment.type === 'image') {
      return (
        <Image 
          source={{ uri: attachment.url }} 
          style={styles.attachmentImage} 
          resizeMode="cover"
        />
      );
    } else {
      return (
        <View style={styles.documentContainer}>
          <Ionicons name="document-text" size={24} color="#007bff" />
          <Text style={styles.documentText} numberOfLines={1}>
            {attachment.fileName || 'Document'}
          </Text>
        </View>
      );
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isPatient = item.sender === 'patient';
    const showDateHeader = index === 0 || (index > 0 && messages[index - 1].date !== item.date);

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeader}>{item.date}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isPatient ? styles.patientMessage : styles.doctorMessage]}>
          {!isPatient && (
            <Image
              source={{ uri: 'https://via.placeholder.com/40' }}
              style={styles.avatar}
            />
          )}
          <View style={[styles.messageBubble, isPatient ? styles.patientBubble : styles.doctorBubble]}>
            {item.attachment && renderAttachment(item.attachment)}
            {item.text && <Text style={[styles.messageText, isPatient && styles.patientMessageText]}>{item.text}</Text>}
            <Text style={[styles.messageTime, isPatient && styles.patientMessageTime]}>{item.time}</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={true}
        />
      )}

      <View style={styles.inputContainer}>
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!sending}
          />
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={handleAttachmentPress}
            disabled={sending}
          >
            <Ionicons name="attach" size={24} color={sending ? "#999" : "#007bff"} />
          </TouchableOpacity>
        </View>
        {sending ? (
          <View style={styles.sendButton}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.sendButton, (!message.trim() && styles.sendButtonDisabled)]} 
            onPress={() => sendMessage()}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeader: {
    backgroundColor: '#e1e1e1',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 12,
    color: '#666',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  patientMessage: {
    justifyContent: 'flex-end',
  },
  doctorMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  patientBubble: {
    backgroundColor: '#007bff',
    borderBottomRightRadius: 4,
  },
  doctorBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  patientMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  patientMessageTime: {
    color: '#e0e0e0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  attachButton: {
    padding: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#b3d7ff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

export default PatientChatDetailsScreen;
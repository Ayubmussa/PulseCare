import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/api';

interface ChatConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantImage?: string;
  participantType: 'patient' | 'staff';
  lastMessage: {
    text: string;
    timestamp: string;
    isRead: boolean;
    senderId: string;
  };
  unreadCount: number;
}

const DoctorChatScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();

  const loadConversations = useCallback(async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) {
        setIsLoading(true);
      }
      
      if (user?.id) {
        const conversationsData = await chatService.getUserConversations(user.id, 'doctor');
        setConversations(conversationsData);
        setFilteredConversations(conversationsData);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Load conversations when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  // Filter conversations based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = conversations.filter(conversation => 
      conversation.participantName.toLowerCase().includes(query)
    );
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations(false);
  };

  const navigateToChatDetails = (conversation: ChatConversation) => {
    navigation.navigate('ChatDetails', {
      conversationId: conversation.id,
      participantId: conversation.participantId,
      participantName: conversation.participantName,
      participantType: conversation.participantType,
      participantImage: conversation.participantImage,
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Same day
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // This week (within 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    if (date >= weekAgo) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    // Older than a week
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
    });
  };

  const startNewChat = () => {
    // Navigate to PatientList screen with a flag indicating we want to start a new chat
    navigation.navigate('PatientList', { action: 'newChat' });
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => {
    const isMyLastMessage = item.lastMessage.senderId === user?.id;
    
    return (
      <TouchableOpacity 
        style={styles.conversationCard}
        onPress={() => navigateToChatDetails(item)}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: item.participantImage || 'https://via.placeholder.com/60' }}
            style={styles.avatar} 
          />
          {item.participantType === 'patient' ? (
            <View style={styles.badgePatient}>
              <Ionicons name="person" size={10} color="#ffffff" />
            </View>
          ) : (
            <View style={styles.badgeStaff}>
              <Ionicons name="medical" size={10} color="#ffffff" />
            </View>
          )}
        </View>
        
        <View style={styles.conversationInfo}>
          <View style={styles.nameTimeRow}>
            <Text style={styles.participantName}>{item.participantName}</Text>
            <Text style={styles.timeText}>{formatTime(item.lastMessage.timestamp)}</Text>
          </View>
          
          <View style={styles.messageRow}>
            <Text 
              style={[
                styles.messageText,
                !item.lastMessage.isRead && !isMyLastMessage && styles.unreadMessage
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isMyLastMessage && <Text style={styles.youPrefix}>You: </Text>}
              {item.lastMessage.text}
            </Text>
            
            {item.unreadCount > 0 && !isMyLastMessage && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#adb5bd" />
          </TouchableOpacity>
        )}
      </View>
      
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : (
        <>
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              {searchQuery.length > 0 ? (
                <>
                  <Ionicons name="search" size={50} color="#adb5bd" />
                  <Text style={styles.emptyText}>
                    No conversations found matching "{searchQuery}"
                  </Text>
                  <TouchableOpacity 
                    style={styles.clearSearchButton}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={styles.clearSearchText}>Clear Search</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="chatbubbles-outline" size={50} color="#adb5bd" />
                  <Text style={styles.emptyText}>No conversations yet</Text>
                  <Text style={styles.emptySubText}>
                    Start a new conversation with a patient or staff member
                  </Text>
                  <TouchableOpacity 
                    style={styles.newChatButton}
                    onPress={startNewChat}
                  >
                    <Ionicons name="add" size={20} color="#ffffff" />
                    <Text style={styles.newChatButtonText}>New Chat</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredConversations}
              keyExtractor={(item) => item.id}
              renderItem={renderConversationItem}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#007bff']}
                  tintColor="#007bff"
                />
              }
            />
          )}
        </>
      )}
      
      {/* New Chat Button */}
      {filteredConversations.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={startNewChat}
        >
          <Ionicons name="chatbubble" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 20,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#007bff',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newChatButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 8,
  },
  listContainer: {
    paddingVertical: 8,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e9ecef',
  },
  badgePatient: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeStaff: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: '500',
    color: '#212529',
  },
  youPrefix: {
    color: '#007bff',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#007bff',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default DoctorChatScreen;
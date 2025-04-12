import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { chatService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Define TypeScript interfaces for the conversation data
interface Conversation {
  id: string;
  doctorId: string;
  doctorName: string;
  avatar: string;
  specialty: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

// Define navigation type
type NavigationProp = any; // Replace with your proper navigation type if available

const PatientChatScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userType } = useAuth();

  // Fetch chat conversations from API
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        console.error('User ID is missing');
        return;
      }
      
      const data = await chatService.getUserConversations(user.id, 'patient');
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      Alert.alert('Error', 'Failed to load conversations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToChatDetails = (conversation: Conversation) => {
    navigation.navigate('ChatDetails', {
      conversationId: conversation.id,
      doctorId: conversation.doctorId,
      doctorName: conversation.doctorName
    });
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Filter conversations based on search query
    if (text.trim() === '') {
      fetchConversations(); // Reset to all conversations
    } else {
      const filtered = conversations.filter(
        conversation => conversation.doctorName.toLowerCase().includes(text.toLowerCase())
      );
      setConversations(filtered);
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.conversationItem}
      onPress={() => navigateToChatDetails(item)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.doctorName}>{item.doctorName}</Text>
          <Text style={styles.messageTime}>{item.lastMessageTime}</Text>
        </View>
        
        <Text style={styles.specialty}>{item.specialty}</Text>
        
        <View style={styles.messageContainer}>
          <Text 
            style={[styles.lastMessage, item.unread > 0 && styles.unreadMessage]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.lastMessage}
          </Text>
          
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  loader: {
    marginTop: 20,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  specialty: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  unreadMessage: {
    color: '#333',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PatientChatScreen;
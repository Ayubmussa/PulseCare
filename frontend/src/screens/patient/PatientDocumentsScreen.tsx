import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/api';

// Define type for document
interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size?: string;
  doctor_name?: string;
  upload_date: string;
}

// Define a type for the Ionicons name prop
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PatientDocumentsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Fetch documents from API
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const data = await documentService.getAllDocuments({ patient_id: user.id });
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      Alert.alert('Error', 'Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getIconForDocType = (type: string): IoniconName => {
    switch(type.toLowerCase()) {
      case 'pdf': return 'document-text-outline' as IoniconName;
      case 'jpg':
      case 'jpeg':
      case 'png': return 'image-outline' as IoniconName;
      case 'doc':
      case 'docx': return 'document-outline' as IoniconName;
      default: return 'document-attach-outline' as IoniconName;
    }
  };

  const handleViewDocument = async (document: Document) => {
    setSelectedDocument(document);
    setModalVisible(true);
    
    // In a real app, this would download or display the document
    setLoading(true);
    try {
      // Here you'd fetch the actual document content if needed
      await documentService.getDocumentById(document.id);
      // Process document data as needed
    } catch (error) {
      console.error('Error fetching document:', error);
      Alert.alert('Error', 'Failed to load document. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = (document: Document) => {
    // In a real app, this would download the document to the device
    Alert.alert('Download Started', `${document.title} is being downloaded.`);
  };

  const handleShareDocument = (document: Document) => {
    // In a real app, this would open the share sheet
    Alert.alert('Sharing', `Share ${document.title} functionality would be implemented here.`);
  };

  const handleUploadDocument = () => {
    // In a real app, this would open document picker and upload
    Alert.alert(
      'Upload Document', 
      'This feature would allow you to upload new medical documents.',
      [
        { text: 'Cancel' },
        { text: 'Upload', onPress: () => console.log('Upload pressed') }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderDocumentItem = ({ item }: { item: Document }) => (
    <TouchableOpacity 
      style={styles.documentItem}
      onPress={() => handleViewDocument(item)}
    >
      <View style={styles.documentIconContainer}>
        <Ionicons name={getIconForDocType(item.file_type)} size={28} color="#007bff" />
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentTitle}>{item.title}</Text>
        <Text style={styles.documentDoctor}>{item.doctor_name || 'Unknown Doctor'}</Text>
        <Text style={styles.documentDate}>{formatDate(item.upload_date)}</Text>
      </View>
      <View style={styles.documentMeta}>
        <Text style={styles.documentType}>{item.file_type?.toUpperCase()}</Text>
        <Text style={styles.documentSize}>{item.file_size || 'Unknown'}</Text>
        <TouchableOpacity 
          style={styles.documentDownload}
          onPress={() => handleDownloadDocument(item)}
        >
          <Ionicons name="download-outline" size={22} color="#007bff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && documents.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Documents</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadDocument}>
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>No documents found</Text>
          </View>
        }
      />

      {/* Document Preview Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDocument?.title}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.documentPreview}>
              {loading ? (
                <ActivityIndicator size="large" color="#007bff" />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons 
                    name={selectedDocument ? getIconForDocType(selectedDocument.file_type) : 'document-outline'} 
                    size={60} 
                    color="#007bff" 
                  />
                  <Text style={styles.previewText}>
                    Document preview would appear here in a real application
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.downloadButton]}
                onPress={() => {
                  if (selectedDocument) handleDownloadDocument(selectedDocument);
                }}
              >
                <Ionicons name="download-outline" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => {
                  if (selectedDocument) handleShareDocument(selectedDocument);
                }}
              >
                <Ionicons name="share-social-outline" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },
  listContent: {
    padding: 16,
  },
  documentItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 10,
    elevation: 2,
  },
  documentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  documentDoctor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  documentMeta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 10,
  },
  documentType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007bff',
  },
  documentSize: {
    fontSize: 12,
    color: '#999',
    marginVertical: 4,
  },
  documentDownload: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  documentPreview: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 120,
  },
  downloadButton: {
    backgroundColor: '#007bff',
    marginRight: 10,
  },
  shareButton: {
    backgroundColor: '#34c759',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
});

export default PatientDocumentsScreen;
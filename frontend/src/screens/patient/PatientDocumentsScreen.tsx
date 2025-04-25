import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { documentService } from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Define type for document
interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size?: string;
  doctor_name?: string;
  upload_date: string;
}

// Define a type for the selected file with the properties we need
interface SelectedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
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
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');

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

  const getIconForDocType = (type: string | undefined): IoniconName => {
    if (!type) return 'document-attach-outline' as IoniconName;
    
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

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        // Extract the filename from the URI if name is not available
        const fileName = pickedAsset.name || pickedAsset.uri.split('/').pop() || 'document';
        
        // Create our own SelectedFile object with the properties we need
        const file: SelectedFile = {
          uri: pickedAsset.uri,
          name: fileName,
          mimeType: pickedAsset.mimeType,
          size: pickedAsset.size
        };
        
        // Set selected file and extract filename for document name suggestion
        setSelectedFile(file);
        setDocumentName(file.name);
        
        // Try to determine document type from file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
          setDocumentType('image');
        } else if (fileExtension === 'pdf') {
          setDocumentType('pdf');
        } else if (['doc', 'docx'].includes(fileExtension)) {
          setDocumentType('document');
        } else {
          setDocumentType('other');
        }
        
        // Show the upload modal
        setUploadModalVisible(true);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const handleUploadDocument = () => {
    pickDocument();
  };

  const uploadFile = async () => {
    if (!selectedFile || !user?.id) {
      Alert.alert('Error', 'No file selected or user not logged in.');
      return;
    }

    setUploadLoading(true);
    try {
      // Calculate file size
      let fileSize = selectedFile.size;
      let formattedSize = '';
      
      if (!fileSize) {
        // If size is not provided by the picker, try to get it from the file system
        try {
          const fileInfo = await FileSystem.getInfoAsync(selectedFile.uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            fileSize = fileInfo.size;
          }
        } catch (error) {
          console.error('Error getting file info:', error);
        }
      }
      
      // Format the file size for display purposes
      formattedSize = formatFileSize(fileSize || 0);
      
      // Create document metadata (remove file_size from here)
      const documentData = {
        patient_id: user.id,
        document_name: documentName || selectedFile.name,
        document_type: documentType || 'other',
        document_url: "placeholder" // This will be replaced by the backend but avoids the 400 error
      };
      
      // Create file object for upload
      const fileUri = selectedFile.uri;
      
      // Determine file type from file extension or from the mimeType if available
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      let fileType = selectedFile.mimeType || 'application/octet-stream'; // Use provided mimeType or default
      
      // If mimeType is not provided, try to determine from extension
      if (!selectedFile.mimeType) {
        if (['jpg', 'jpeg'].includes(fileExtension || '')) {
          fileType = 'image/jpeg';
        } else if (fileExtension === 'png') {
          fileType = 'image/png';
        } else if (fileExtension === 'pdf') {
          fileType = 'application/pdf';
        } else if (fileExtension === 'doc') {
          fileType = 'application/msword';
        } else if (fileExtension === 'docx') {
          fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
      }
      
      // Create the file object with the right format for FormData
      // Ensure it's structured according to React Native File requirements
      const fileObject = {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        type: fileType,
        name: selectedFile.name
      };
      
      console.log('Uploading document with data:', documentData);
      console.log('File object:', fileObject);
      
      // Upload document with file
      await documentService.uploadDocument(documentData, fileObject);
      
      // Refresh the documents list
      await fetchDocuments();
      
      // Close the modal and reset state
      setUploadModalVisible(false);
      setSelectedFile(null);
      setDocumentName('');
      setDocumentType('');
      
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      
      // Enhanced error reporting
      if (error instanceof Error) {
        Alert.alert('Upload Failed', `Failed to upload document: ${error.message}`);
      } else {
        Alert.alert('Upload Failed', 'Failed to upload document. Please try again later.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

      {/* Upload Document Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={uploadModalVisible}
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Document</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  if (!uploadLoading) {
                    setUploadModalVisible(false);
                    setSelectedFile(null);
                  }
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.uploadContent}>
              {selectedFile && (
                <View style={styles.selectedFileContainer}>
                  {/* Show image preview if it's an image */}
                  {selectedFile.name.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                    <Image 
                      source={{ uri: selectedFile.uri }} 
                      style={styles.imagePreview} 
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.fileIconContainer}>
                      <Ionicons 
                        name={getIconForDocType(selectedFile.name.split('.').pop() || '')} 
                        size={50} 
                        color="#007bff" 
                      />
                      <Text style={styles.fileNameText} numberOfLines={1} ellipsizeMode="middle">
                        {selectedFile.name}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Document Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={documentName}
                  onChangeText={setDocumentName}
                  placeholder="Enter document name"
                  editable={!uploadLoading}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Document Type</Text>
                <View style={styles.documentTypeContainer}>
                  {['Medical Record', 'Lab Result', 'Prescription', 'Insurance', 'Other'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        documentType.toLowerCase() === type.toLowerCase() && styles.selectedTypeButton
                      ]}
                      onPress={() => setDocumentType(type.toLowerCase())}
                      disabled={uploadLoading}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        documentType.toLowerCase() === type.toLowerCase() && styles.selectedTypeText
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.uploadActionButton, uploadLoading && styles.disabledButton]}
                onPress={uploadFile}
                disabled={uploadLoading || !selectedFile}
              >
                {uploadLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                    <Text style={styles.uploadActionButtonText}>Upload Document</Text>
                  </>
                )}
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
  
  // Upload functionality styles
  uploadContent: {
    padding: 20,
  },
  selectedFileContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  fileIconContainer: {
    alignItems: 'center',
    padding: 20,
  },
  fileNameText: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
    maxWidth: 250,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  documentTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTypeButton: {
    backgroundColor: '#007bff',
  },
  typeButtonText: {
    color: '#333',
    fontSize: 14,
  },
  selectedTypeText: {
    color: '#fff',
  },
  uploadActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  uploadActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default PatientDocumentsScreen;
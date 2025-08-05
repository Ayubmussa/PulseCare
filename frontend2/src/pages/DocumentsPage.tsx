import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { documentsService } from '../services/api';
import { Document } from '../types';
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  Download, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  Plus,
  X,
  FileUp,
  Folder,
  Grid,
  List
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'image' | 'pdf' | 'document' | 'recent';

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Utility functions for safe data access - handles both backend and frontend field names
  const getDocumentName = (doc: Document): string => doc.name || doc.document_name || 'Untitled';
  const getDocumentType = (doc: Document): string => doc.type || doc.document_type || 'unknown';  const getDocumentUrl = (doc: Document): string => doc.url || doc.document_url || doc.fileUrl || '';
  const getDocumentUploadDate = (doc: Document): string => doc.uploadDate || doc.created_at || new Date().toISOString();
  const getDocumentSize = (doc: Document): number => doc.size || 0;

  const fetchDocuments = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await documentsService.getPatientDocuments(user.id);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);
  const filterDocuments = useCallback(() => {
    let filtered = documents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => {
        const name = getDocumentName(doc);
        const type = getDocumentType(doc);
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               type.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'recent') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter(doc => {
          const uploadDate = getDocumentUploadDate(doc);
          return uploadDate && new Date(uploadDate) >= sevenDaysAgo;
        });
      } else if (filterType === 'image') {
        filtered = filtered.filter(doc => {
          const type = getDocumentType(doc);
          return type.startsWith('image/');
        });
      } else if (filterType === 'pdf') {
        filtered = filtered.filter(doc => {
          const type = getDocumentType(doc);
          return type === 'application/pdf';
        });
      } else if (filterType === 'document') {
        filtered = filtered.filter(doc => {
          const type = getDocumentType(doc);
          return type.includes('word') || 
                 type.includes('document') ||
                 type.includes('text');
        });
      }
    }

    // Sort by upload date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(getDocumentUploadDate(a)).getTime();
      const dateB = new Date(getDocumentUploadDate(b)).getTime();
      return dateB - dateA;
    });    setFilteredDocuments(filtered);
  }, [documents, searchTerm, filterType]);

  useEffect(() => {
    if (user?.id) {
      fetchDocuments();
    }
  }, [user?.id, fetchDocuments]);

  useEffect(() => {
    filterDocuments();
  }, [filterDocuments]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleUpload = async () => {
    if (!user?.id || selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      
      for (const file of selectedFiles) {
        await documentsService.uploadDocument(user.id, file, getFileType(file.type));
      }

      toast.success(`Successfully uploaded ${selectedFiles.length} document(s)`);
      setSelectedFiles([]);
      setShowUploadModal(false);
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const fileUrl = getDocumentUrl(document);
      const fileName = getDocumentName(document);
      
      if (!fileUrl) {
        toast.error('Document URL not available');
        return;
      }
      
      // Create a temporary link and trigger download
      const link = window.document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (documentId: string, documentName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }

    try {
      await documentsService.deleteDocument(documentId);
      toast.success('Document deleted successfully');
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    return 'general';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDocumentStats = () => {
    const totalSize = documents.reduce((acc, doc) => acc + getDocumentSize(doc), 0);
    const imageCount = documents.filter(doc => getDocumentType(doc).startsWith('image/')).length;
    const pdfCount = documents.filter(doc => getDocumentType(doc) === 'application/pdf').length;
    const otherCount = documents.length - imageCount - pdfCount;

    return { totalSize, imageCount, pdfCount, otherCount };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  const stats = getDocumentStats();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p className="text-gray-600">Manage your medical documents and files</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Upload Documents
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Folder className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <Image className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Images</p>
              <p className="text-2xl font-bold text-gray-900">{stats.imageCount}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">PDFs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pdfCount}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Upload className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(stats.totalSize)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Search */}
          <div className="lg:col-span-5">
            <label className="label">Search Documents</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="lg:col-span-3">
            <label className="label">Filter</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="input pl-10 pr-8 appearance-none bg-white w-full"
              >
                <option value="all">All Documents</option>
                <option value="recent">Recent (7 days)</option>
                <option value="image">Images</option>
                <option value="pdf">PDFs</option>
                <option value="document">Documents</option>
              </select>
            </div>
          </div>

          {/* View Mode */}
          <div className="lg:col-span-4">
            <label className="label">View</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg flex-1 flex items-center justify-center gap-1 ${
                  viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 border'
                }`}
              >
                <Grid className="h-4 w-4" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg flex-1 flex items-center justify-center gap-1 ${
                  viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 border'
                }`}
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          Showing {filteredDocuments.length} of {documents.length} documents
        </p>
      </div>

      {/* Documents Display */}
      {filteredDocuments.length === 0 ? (
        <div className="card p-12 text-center">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600 mb-4">
            {documents.length === 0 
              ? "You haven't uploaded any documents yet."
              : "Try adjusting your search criteria or filters."
            }
          </p>
          {documents.length === 0 && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Upload Your First Document
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-4'
        }>
          {filteredDocuments.map((document) => (
            <div key={document.id} className={`card p-6 ${viewMode === 'list' ? 'flex items-center' : ''}`}>
              {viewMode === 'grid' ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {getFileIcon(getDocumentType(document))}
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={getDocumentName(document)}>
                          {getDocumentName(document)}
                        </h3>
                        <p className="text-xs text-gray-500">{formatFileSize(getDocumentSize(document))}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(getDocumentUploadDate(document))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(document)}
                      className="btn btn-outline btn-sm flex items-center gap-1 flex-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(document.id, getDocumentName(document))}
                      className="btn btn-ghost btn-sm p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center w-full">
                  <div className="flex items-center flex-1">
                    {getFileIcon(getDocumentType(document))}
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{getDocumentName(document)}</h3>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(getDocumentSize(document))} • {formatDate(getDocumentUploadDate(document))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDownload(document)}
                      className="btn btn-outline btn-sm flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(document.id, getDocumentName(document))}
                      className="btn btn-ghost btn-sm p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Upload Documents</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop files here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: PDF, JPG, PNG, DOCX (Max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center">
                          {getFileIcon(file.type)}
                          <span className="text-sm text-gray-900 ml-2">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFiles([]);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || isUploading}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;

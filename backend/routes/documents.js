const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Get all documents
router.get('/', documentController.getAllDocuments);

// Get document by ID
router.get('/:id', documentController.getDocumentById);

// Upload a new document
router.post('/', upload.single('document'), documentController.uploadDocument);

// Update document details
router.put('/:id', documentController.updateDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

// Get documents by type
router.get('/type', documentController.getDocumentsByType);

module.exports = router;
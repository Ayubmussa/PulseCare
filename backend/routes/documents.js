const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Get all documents
router.get('/', documentController.getAllDocuments);

// Get document by ID
router.get('/:id', documentController.getDocumentById);

// Upload a new document
router.post('/', documentController.uploadDocument);

// Update document details
router.put('/:id', documentController.updateDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

// Get documents by type
router.get('/type', documentController.getDocumentsByType);

module.exports = router;
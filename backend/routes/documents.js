const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const formidable = require('formidable');

// Configure formidable for file uploads
const createUploadMiddleware = () => {
  return (req, res, next) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      allowEmptyFiles: false,
      keepExtensions: true,
      filter: function ({name, originalFilename, mimetype}) {
        // Allow common document and image types
        const allowedTypes = [
          'application/pdf',
          'image/jpeg', 
          'image/png',
          'image/gif',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        return allowedTypes.includes(mimetype);
      }
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({ error: 'File upload failed', details: err.message });
      }
      req.fields = fields;
      req.files = files;
      next();
    });
  };
};

// Get all documents
router.get('/', documentController.getAllDocuments);

// Get document by ID
router.get('/:id', documentController.getDocumentById);

// Upload a new document
router.post('/', createUploadMiddleware(), documentController.uploadDocument);

// Update document details
router.put('/:id', documentController.updateDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

// Get documents by type
router.get('/type', documentController.getDocumentsByType);

module.exports = router;
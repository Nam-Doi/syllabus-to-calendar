const express = require('express');
const router = express.Router();
const chatController = require('../controllers/ChatController');

router.post('/ask', chatController.handleChat);

module.exports = router;
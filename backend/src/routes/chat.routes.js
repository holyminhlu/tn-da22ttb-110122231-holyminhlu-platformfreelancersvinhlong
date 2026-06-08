const express = require("express");
const chat = require("../controllers/chat.controller");

const router = express.Router();

router.get("/conversations", chat.listConversations);
router.post("/conversations/open", chat.openConversation);
router.get("/conversations/:conversationId/messages", chat.listMessages);
router.post("/conversations/:conversationId/messages", chat.sendMessage);

module.exports = router;

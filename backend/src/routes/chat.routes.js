const express = require("express");
const chat = require("../controllers/chat.controller");

const router = express.Router();

router.get("/conversations", chat.listConversations);
router.post("/conversations/open", chat.openConversation);
router.delete("/conversations/:conversationId", chat.hideConversation);
router.post("/conversations/:conversationId/block", chat.blockPeer);
router.delete("/conversations/:conversationId/block", chat.unblockPeer);
router.post("/conversations/:conversationId/attachments", chat.uploadAttachment);
router.post("/conversations/:conversationId/read", chat.markConversationReadHandler);
router.get("/conversations/:conversationId/messages", chat.listMessages);
router.post("/conversations/:conversationId/messages", chat.sendMessage);

module.exports = router;

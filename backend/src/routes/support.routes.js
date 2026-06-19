const express = require("express");
const support = require("../controllers/support.controller");

const router = express.Router();

router.post("/ai-chat", support.postAiSupportChat);

module.exports = router;

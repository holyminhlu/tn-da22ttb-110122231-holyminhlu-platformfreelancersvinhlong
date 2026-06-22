const express = require("express");
const contact = require("../controllers/contact.controller");

const router = express.Router();

router.get("/", contact.getPublicContact);

module.exports = router;

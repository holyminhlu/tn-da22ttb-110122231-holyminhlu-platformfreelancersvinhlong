const express = require("express");
const maps = require("../controllers/maps.controller");

const router = express.Router();

router.get("/status", maps.getMapsStatus);
router.get("/route-preview", maps.getRoutePreview);

module.exports = router;

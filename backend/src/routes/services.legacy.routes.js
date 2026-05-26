const express = require("express");
const services = require("../controllers/services.controller");

/** Đường dẫn cũ: /api/auth/me/service, … */
const router = express.Router();

router.post("/me/service-images", services.uploadServiceImages);
router.post("/me/service-thumbnail", services.uploadServiceThumbnail);
router.post("/me/service-demo", services.uploadServiceDemo);
router.post("/me/service", services.createMyService);
router.patch("/me/service/:serviceId", services.updateMyService);

module.exports = router;

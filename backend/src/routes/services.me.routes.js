const express = require("express");
const services = require("../controllers/services.controller");

const router = express.Router();

router.post("/service-images", services.uploadServiceImages);
router.post("/service-thumbnail", services.uploadServiceThumbnail);
router.post("/service-demo", services.uploadServiceDemo);
router.post("/service", services.createMyService);
router.patch("/service/:serviceId", services.updateMyService);

module.exports = router;

const express = require("express");
const services = require("../controllers/services.controller");

const router = express.Router();

router.post("/service-images", services.uploadServiceImages);
router.post("/service-thumbnail", services.uploadServiceThumbnail);
router.post("/service-demo", services.uploadServiceDemo);
router.get("/services", services.listMyServices);
router.get("/service/:serviceId", services.getMyService);
router.post("/service", services.createMyService);
router.patch("/service/:serviceId", services.updateMyService);
router.patch("/service/:serviceId/status", services.patchMyServiceStatus);
router.get("/reviews", services.listMyServiceReviews);
router.patch("/reviews/:reviewId/reply", services.replyServiceReview);

module.exports = router;

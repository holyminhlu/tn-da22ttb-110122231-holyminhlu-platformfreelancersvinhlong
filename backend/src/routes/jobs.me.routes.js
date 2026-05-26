const express = require("express");
const jobs = require("../controllers/jobs.controller");

const router = express.Router();

router.post("/job-images", jobs.uploadJobImages);
router.post("/job", jobs.createMyJob);
router.post("/jobs/:jobId/accept", jobs.acceptJob);

module.exports = router;

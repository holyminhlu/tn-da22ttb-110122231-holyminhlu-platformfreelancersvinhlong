const express = require("express");
const jobs = require("../controllers/jobs.controller");

/** Đường dẫn cũ: /api/auth/me/job, /api/auth/me/job-images, … */
const router = express.Router();

router.post("/me/job-images", jobs.uploadJobImages);
router.post("/me/job", jobs.createMyJob);
router.post("/me/jobs/:jobId/accept", jobs.acceptJob);

module.exports = router;

const express = require("express");
const jobs = require("../controllers/jobs.controller");

const router = express.Router();

router.get("/jobs", jobs.listMyJobs);
router.post("/job-images", jobs.uploadJobImages);
router.post("/job", jobs.createMyJob);
router.patch("/jobs/:jobId", jobs.updateMyJob);
router.delete("/jobs/:jobId", jobs.deleteMyJob);
router.post("/jobs/:jobId/accept", jobs.acceptJob);

module.exports = router;

const express = require("express");
const jobs = require("../controllers/jobs.controller");

const router = express.Router();

router.get("/jobs", jobs.listMyJobs);
router.post("/job-images", jobs.uploadJobImages);
router.post("/job", jobs.createMyJob);
router.patch("/jobs/:jobId", jobs.updateMyJob);
router.delete("/jobs/:jobId", jobs.deleteMyJob);
router.post("/jobs/:jobId/accept", jobs.acceptJob);
router.get("/quotes", jobs.listMyJobQuotes);
router.patch("/quotes/:quoteId", jobs.patchJobQuote);
router.get("/saved-jobs/ids", jobs.listSavedJobIds);
router.get("/saved-jobs", jobs.listSavedJobs);
router.post("/saved-jobs/:jobId", jobs.saveJob);
router.delete("/saved-jobs/:jobId", jobs.unsaveJob);

module.exports = router;

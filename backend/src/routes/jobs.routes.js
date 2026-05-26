const express = require("express");
const jobs = require("../controllers/jobs.controller");

const router = express.Router();

router.get("/", jobs.listJobs);
router.get("/categories", jobs.listJobCategories);
router.get("/:jobId", jobs.getJob);

module.exports = router;

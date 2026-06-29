const express = require("express");
const freelancers = require("../controllers/freelancers.controller");

const router = express.Router();

router.get("/top-skills", freelancers.getTopSkills);
router.get("/top-locations", freelancers.getTopLocations);
router.get("/", freelancers.listFreelancers);
router.get("/:freelancerId/profile-files/:fileId/download", freelancers.downloadProfileFile);
router.get(
  "/:freelancerId/exclusive-resources/:resourceId/download",
  freelancers.downloadExclusiveResourceFile,
);
router.get("/:freelancerId", freelancers.getFreelancer);

module.exports = router;

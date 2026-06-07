const express = require("express");
const freelancers = require("../controllers/freelancers.controller");

const router = express.Router();

router.get("/top-skills", freelancers.getTopSkills);
router.get("/", freelancers.listFreelancers);
router.get("/:freelancerId", freelancers.getFreelancer);

module.exports = router;

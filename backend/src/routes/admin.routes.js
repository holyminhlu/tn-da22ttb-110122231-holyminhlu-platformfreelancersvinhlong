const express = require("express");
const admin = require("../controllers/admin.controller");

const router = express.Router();

router.get("/freelancer-approvals", admin.listFreelancerApprovals);
router.get("/freelancer-approvals/:userId", admin.getFreelancerApproval);
router.post("/freelancer-approvals/:userId/approve", admin.approveFreelancer);
router.post("/freelancer-approvals/:userId/reject", admin.rejectFreelancer);

module.exports = router;

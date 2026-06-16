const express = require("express");
const admin = require("../controllers/admin.controller");
const adminDisputes = require("../controllers/adminDisputes.controller");
const adminRefunds = require("../controllers/adminRefunds.controller");
const adminWithdrawals = require("../controllers/adminWithdrawals.controller");

const router = express.Router();

router.get("/freelancer-approvals", admin.listFreelancerApprovals);
router.get("/freelancer-approvals/:userId", admin.getFreelancerApproval);
router.post("/freelancer-approvals/:userId/approve", admin.approveFreelancer);
router.post("/freelancer-approvals/:userId/reject", admin.rejectFreelancer);

router.get("/disputes", adminDisputes.listAdminDisputes);
router.get("/disputes/:disputeId", adminDisputes.getAdminDisputeDetail);
router.post("/disputes/:disputeId/messages", adminDisputes.postAdminDisputeMessage);
router.post("/disputes/:disputeId/resolve", adminDisputes.resolveAdminDispute);

router.get("/refunds", adminRefunds.listAdminRefunds);
router.get("/refunds/:requestId", adminRefunds.getAdminRefundDetail);
router.post("/refunds/:requestId/resolve", adminRefunds.resolveAdminRefund);

router.get("/withdrawals", adminWithdrawals.listAdminWithdrawals);
router.get("/withdrawals/:withdrawalId", adminWithdrawals.getAdminWithdrawalDetail);
router.post("/withdrawals/:withdrawalId/resolve", adminWithdrawals.resolveAdminWithdrawal);

module.exports = router;

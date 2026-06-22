const express = require("express");
const admin = require("../controllers/admin.controller");
const adminDisputes = require("../controllers/adminDisputes.controller");
const adminRefunds = require("../controllers/adminRefunds.controller");
const adminWithdrawals = require("../controllers/adminWithdrawals.controller");
const adminUsers = require("../controllers/adminUsers.controller");
const contact = require("../controllers/contact.controller");
const adminStats = require("../controllers/adminStats.controller");

const router = express.Router();

router.get("/stats/overview", adminStats.getAdminStatsOverview);

router.get("/users", adminUsers.listAdminUsers);
router.get("/users/:userId/full", adminUsers.getAdminUserFull);
router.get("/users/:userId", adminUsers.getAdminUser);
router.patch("/users/:userId", adminUsers.updateAdminUser);
router.patch("/users/:userId/status", adminUsers.updateAdminUserStatus);

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

router.get("/contact", contact.getAdminContact);
router.patch("/contact", contact.updateAdminContact);
router.post("/contact/social-links", contact.createSocialLink);
router.patch("/contact/social-links/:linkId", contact.updateSocialLink);
router.delete("/contact/social-links/:linkId", contact.deleteSocialLink);

module.exports = router;

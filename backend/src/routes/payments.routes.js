const express = require("express");
const payments = require("../controllers/payments.controller");

const router = express.Router();

router.get("/billing", payments.getBilling);
router.patch("/billing-profile", payments.updateBillingProfile);
router.post("/billing-methods", payments.addBillingMethod);
router.patch("/billing-methods/:methodId/default", payments.setDefaultBillingMethod);
router.delete("/billing-methods/:methodId", payments.deleteBillingMethod);
router.post("/deposit", payments.depositFunds);
router.post("/withdraw", payments.withdrawFreelancerFunds);

module.exports = router;

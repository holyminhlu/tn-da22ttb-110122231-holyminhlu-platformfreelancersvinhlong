const express = require("express");
const payments = require("../controllers/payments.controller");

const router = express.Router();

router.get("/billing", payments.getBilling);
router.patch("/billing-profile", payments.updateBillingProfile);
router.post("/billing-methods", payments.addBillingMethod);
router.patch("/billing-methods/:methodId/default", payments.setDefaultBillingMethod);
router.delete("/billing-methods/:methodId", payments.deleteBillingMethod);
router.post("/create-payment-link", payments.createPaymentLink);
router.post("/payos-webhook", payments.payosWebhook);
router.get("/deposit-orders/:orderCode", payments.getDepositOrderStatus);
router.post("/deposit-orders/:orderCode/cancel", payments.cancelDepositOrder);
router.post("/withdraw", payments.withdrawFreelancerFunds);
router.post("/withdraw/request", payments.requestWithdrawal);
router.post("/withdraw/:orderId/confirm", payments.confirmWithdrawalOrder);
router.get("/withdraw/:orderId/status", payments.getWithdrawalOrderStatus);
router.get("/withdrawal-pin", payments.getWithdrawalPinSettings);
router.put("/withdrawal-pin", payments.saveWithdrawalPinSettings);
router.post("/payos-payout-webhook", payments.payosPayoutWebhook);
router.put("/payout-account", payments.saveFreelancerPayoutAccount);
router.delete("/payout-account", payments.unlinkFreelancerPayoutAccount);

module.exports = router;

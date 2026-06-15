const express = require("express");
const contracts = require("../controllers/contracts.controller");
const workflow = require("../controllers/contractWorkflow.controller");
const resolution = require("../controllers/resolutionCenter.controller");

const router = express.Router();

router.get("/", contracts.listMyContracts);
router.get("/my-work", contracts.getMyWork);
router.get("/service-orders", workflow.listServiceOrders);
router.get("/resolution/refund-requests", resolution.listRefundRequests);
router.get("/resolution/disputes", resolution.listDisputes);
router.post("/resolution/dispute-evidence", resolution.uploadEvidence);
router.get("/resolution/disputes/:disputeId", resolution.getDisputeDetail);
router.post("/resolution/disputes/:disputeId/messages", resolution.postDisputeMessage);
router.post("/from-service-quote", workflow.createFromServiceQuote);
router.get("/:contractId/workflow", workflow.getContractWorkflow);
router.patch("/:contractId/workflow", workflow.patchContractWorkflow);
router.patch("/:contractId", contracts.patchMyContract);
router.post("/:contractId/review", contracts.reviewContract);

module.exports = router;

const express = require("express");
const contracts = require("../controllers/contracts.controller");
const workflow = require("../controllers/contractWorkflow.controller");

const router = express.Router();

router.get("/", contracts.listMyContracts);
router.get("/my-work", contracts.getMyWork);
router.get("/service-orders", workflow.listServiceOrders);
router.post("/from-service-quote", workflow.createFromServiceQuote);
router.get("/:contractId/workflow", workflow.getContractWorkflow);
router.patch("/:contractId/workflow", workflow.patchContractWorkflow);
router.patch("/:contractId", contracts.patchMyContract);
router.post("/:contractId/review", contracts.reviewContract);

module.exports = router;

const express = require("express");
const contracts = require("../controllers/contracts.controller");

const router = express.Router();

router.get("/me/contracts", contracts.listMyContracts);
router.get("/me/my-work", contracts.getMyWork);
router.patch("/me/contracts/:contractId", contracts.patchMyContract);
router.post("/me/contracts/:contractId/review", contracts.reviewContract);

module.exports = router;

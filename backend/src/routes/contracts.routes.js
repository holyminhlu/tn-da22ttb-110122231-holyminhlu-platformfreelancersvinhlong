const express = require("express");
const contracts = require("../controllers/contracts.controller");

const router = express.Router();

router.get("/", contracts.listMyContracts);
router.get("/my-work", contracts.getMyWork);
router.patch("/:contractId", contracts.patchMyContract);
router.post("/:contractId/review", contracts.reviewContract);

module.exports = router;

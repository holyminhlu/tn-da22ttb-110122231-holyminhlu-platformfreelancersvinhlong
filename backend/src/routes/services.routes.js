const express = require("express");
const services = require("../controllers/services.controller");

const router = express.Router();

router.get("/", services.listServices);
router.get("/categories", services.listCategories);
router.get("/:serviceId", services.getService);

module.exports = router;

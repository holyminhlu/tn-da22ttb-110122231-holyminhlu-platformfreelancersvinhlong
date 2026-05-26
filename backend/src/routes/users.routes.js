const express = require("express");
const users = require("../controllers/users.controller");
const profileStats = require("../controllers/profileStats.controller");
const identityVerification = require("../controllers/identityVerification.controller");

const router = express.Router();

router.use((req, _res, next) => {
  if (req.path === "/me/avatar") {
    console.log(`[users avatar] ${req.method} ${req.originalUrl}`);
  }
  next();
});

router.options("/me/avatar", (_req, res) => res.sendStatus(204));
router.get("/me", users.getMe);
router.get("/me/feedback", users.listMyFeedback);
router.get("/me/profile-stats", profileStats.getProfileStats);
router.get("/me/identity-verification", identityVerification.getIdentityVerification);
router.patch("/me/identity-verification", identityVerification.patchIdentityVerification);
router.post("/me/identity-verification/selfie", identityVerification.uploadSelfie);
router.post("/me/identity-verification/id-front", identityVerification.uploadIdFront);
router.post("/me/identity-verification/id-back", identityVerification.uploadIdBack);
router.post("/me/identity-verification/address-proof", identityVerification.uploadAddressProof);
router.post("/me/identity-verification/card", identityVerification.addCreditCard);
router.post("/me/identity-verification/card/verify-charge", identityVerification.verifyCardCharge);
router.patch("/me/avatar", users.updateAvatar);
router.post("/me/avatar", users.updateAvatar);
router.patch("/me/profile", users.updateProfile);
router.patch("/me/email", users.changeEmail);
router.patch("/me/password", users.changePassword);
router.put("/me/skills", users.updateSkills);
router.post("/me/portfolio", users.createPortfolio);

module.exports = router;

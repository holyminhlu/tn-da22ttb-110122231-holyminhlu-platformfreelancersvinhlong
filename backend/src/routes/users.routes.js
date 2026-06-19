const express = require("express");
const users = require("../controllers/users.controller");
const profileStats = require("../controllers/profileStats.controller");
const identityVerification = require("../controllers/identityVerification.controller");
const favoriteFreelancers = require("../controllers/favoriteFreelancers.controller");

const security = require("../controllers/security.controller");

const router = express.Router();

router.use((req, _res, next) => {
  if (req.path === "/me/avatar") {
    console.log(`[users avatar] ${req.method} ${req.originalUrl}`);
  }
  next();
});

router.options("/me/avatar", (_req, res) => res.sendStatus(204));
router.get("/public/home-stats", users.getPublicHomeStats);
router.get("/me", users.getMe);
router.get("/me/credentials", users.getCredentials);
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
router.post("/me/identity-verification/card/payment-link", identityVerification.createCardVerifyPaymentLink);
router.get("/me/identity-verification/card/payment-status/:orderCode", identityVerification.getCardVerifyPaymentStatus);
router.post("/me/identity-verification/card/payment-status/:orderCode/cancel", identityVerification.cancelCardVerifyPayment);
router.patch("/me/avatar", users.updateAvatar);
router.post("/me/avatar", users.updateAvatar);
router.patch("/me/profile", users.updateProfile);
router.patch("/me/email", users.changeEmail);
router.patch("/me/password", users.changePassword);
router.get("/me/security", security.getSecurityOverview);
router.get("/me/security/sessions", security.listSessions);
router.delete("/me/security/sessions/:sessionId", security.revokeSession);
router.post("/me/security/sessions/revoke-others", security.revokeOtherSessions);
router.get("/me/security/login-history", security.listLoginHistory);
router.patch("/me/security/recovery", security.updateRecoverySettings);
router.post("/me/security/deactivate", security.deactivateAccount);
router.delete("/me/security/account", security.deleteAccount);
router.put("/me/skills", users.updateSkills);
router.post("/me/portfolio", users.createPortfolio);
router.post("/me/exclusive-resources", users.createExclusiveResource);
router.post("/me/profile-files", users.createProfileFile);
router.post("/me/profile-file-upload", users.uploadProfileFileAsset);
router.get("/me/favorite-freelancers/ids", favoriteFreelancers.listFavoriteFreelancerIds);
router.post("/me/favorite-freelancers/sync", favoriteFreelancers.syncFavoriteFreelancers);
router.post("/me/favorite-freelancers/:freelancerId", favoriteFreelancers.addFavoriteFreelancer);
router.delete("/me/favorite-freelancers/:freelancerId", favoriteFreelancers.removeFavoriteFreelancer);

module.exports = router;

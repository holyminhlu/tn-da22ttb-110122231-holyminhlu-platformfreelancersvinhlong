const express = require("express");
const notifications = require("../controllers/notifications.controller");

const router = express.Router();

router.get("/", notifications.listNotifications);
router.get("/unread-count", notifications.getUnreadCount);
router.patch("/read-all", notifications.markAllRead);
router.delete("/read", notifications.deleteReadNotifications);
router.patch("/:notificationId/read", notifications.markNotificationRead);
router.delete("/:notificationId", notifications.deleteNotification);

module.exports = router;

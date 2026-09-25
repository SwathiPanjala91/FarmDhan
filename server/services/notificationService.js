const Notification = require('../models/Notification');

const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedListingId = null,
  relatedTransactionId = null,
  relatedOfferId = null,
}) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedListingId,
      relatedTransactionId,
      relatedOfferId,
    });
    return notification;
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
    return null;
  }
};

module.exports = { createNotification };

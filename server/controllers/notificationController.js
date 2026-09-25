const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const rawNotifications = await Notification.find({ userId: req.user._id })
      .populate('relatedListingId', 'wasteType quantity unit image expectedPrice location status')
      .populate({
        path: 'relatedOfferId',
        populate: [
          { path: 'buyerId', select: 'name phone location' },
          {
            path: 'listingId',
            select: 'wasteType quantity unit expectedPrice location farmerId status',
            populate: { path: 'farmerId', select: 'name phone location' },
          },
        ],
      })
      .populate({
        path: 'relatedTransactionId',
        populate: [
          { path: 'buyerId', select: 'name phone location' },
          { path: 'farmerId', select: 'name phone location' },
          { path: 'listingId', select: 'wasteType quantity unit image location' },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(50);

    // Apply strict privacy: If relatedOffer is NOT accepted, hide phone numbers!
    const notifications = rawNotifications.map((notif) => {
      const n = notif.toObject();
      if (n.relatedOfferId) {
        const isAccepted = n.relatedOfferId.status === 'accepted';
        if (!isAccepted) {
          if (n.relatedOfferId.buyerId && n.relatedOfferId.buyerId.phone) {
            delete n.relatedOfferId.buyerId.phone;
          }
          if (n.relatedOfferId.listingId?.farmerId && n.relatedOfferId.listingId.farmerId.phone) {
            delete n.relatedOfferId.listingId.farmerId.phone;
          }
        }
      }
      // Attach stable, direct entity IDs for deterministic navigation
      n.listingId = notif.relatedListingId?._id
        ? notif.relatedListingId._id.toString()
        : (notif.relatedListingId ? notif.relatedListingId.toString() : null);
      n.offerId = notif.relatedOfferId?._id
        ? notif.relatedOfferId._id.toString()
        : (notif.relatedOfferId ? notif.relatedOfferId.toString() : null);
      n.transactionId = notif.relatedTransactionId?._id
        ? notif.relatedTransactionId._id.toString()
        : (notif.relatedTransactionId ? notif.relatedTransactionId.toString() : null);

      // Target screen guidance based on notification type and user role
      if (n.type === 'offer_received') {
        n.targetScreen = 'PriceComparison';
      } else if (n.type === 'offer_accepted' || n.type === 'offer_rejected') {
        n.targetScreen = req.user.role === 'buyer' ? 'MyOffers' : 'PriceComparison';
      } else if (n.type === 'buyer_selected' || n.type === 'transaction_update' || n.type === 'pickup_update') {
        n.targetScreen = 'Profile';
      } else if (n.type === 'new_listing') {
        n.targetScreen = 'BrowseListings';
      } else if (n.type === 'new_requirement') {
        n.targetScreen = 'NearbyBuyers';
      } else if (n.type === 'fpo') {
        n.targetScreen = 'Support';
      } else if (n.type === 'message') {
        n.targetScreen = 'AIAssistant';
      } else {
        n.targetScreen = null;
      }

      return n;
    });

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { read: true });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};

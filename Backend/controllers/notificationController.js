const { Notification } = require("../models/notification");

// Get all notifications for the logged-in user or admin
const getNotifications = async (req, res) => {
  try {
    const recipientId = req.userId;
    const { page = 1, limit = 10, unreadOnly = false } = req.query;

    const query = { recipient: recipientId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'username name profilePhoto') // Populates based on senderModel
      .populate('relatedCourse', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalNotifications = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, isRead: false });

    res.status(200).json({
      notifications,
      totalPages: Math.ceil(totalNotifications / limit),
      currentPage: parseInt(page),
      totalNotifications,
      unreadCount,
    });
  } catch (err) {
    console.error('--- ERROR in getNotifications ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const recipientId = req.userId;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: recipientId,
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or you do not have permission to view it.' });
    }

    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('--- ERROR in markAsRead ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Mark all notifications as read for the logged-in user
const markAllAsRead = async (req, res) => {
  try {
    const recipientId = req.userId;

    await Notification.updateMany(
      { recipient: recipientId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('--- ERROR in markAllAsRead ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete a single notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const recipientId = req.userId;

    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: recipientId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Notification not found or you do not have permission to delete it.' });
    }

    res.status(200).json({ message: 'Notification deleted successfully.' });
  } catch (err) {
    console.error('--- ERROR in deleteNotification ---', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Get user's notifications
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    });

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Get unread count only
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    });
    res.json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
});

// Delete a notification
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Delete all read notifications
router.delete('/clear/read', async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user._id,
      isRead: true
    });

    res.json({ message: `Deleted ${result.deletedCount} notifications` });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ message: 'Error clearing notifications' });
  }
});

module.exports = router;

import express from 'express';
import {pool} from '../db/index.js';
import { requireLogin } from '../middleware/auth.js';
const router = express.Router();

// Get user's notifications
router.get('/', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/read/:id', requireLogin, async (req, res) => {
  try {
    const notifId = req.params.id;
    const userId = req.session.user?.id;
    
    // Verify the notification belongs to the user
    const { rows } = await pool.query(
      `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`,
      [notifId, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1`,
      [notifId]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;


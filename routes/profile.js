import express from 'express';
import { pool } from '../db/index.js';
import { requireLogin } from '../middleware/auth.js';
import bcrypt from 'bcrypt';

const router = express.Router();

// View profile
router.get('/profile', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { rows } = await pool.query(
      `SELECT id, username, email, role, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).send('User not found');
    }

    res.render('layout', {
      user: rows[0],
      title: 'My Profile',
      body: 'profile'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Update profile
router.post('/profile', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { username, current_password, new_password } = req.body;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update basic info
      await client.query(
        `UPDATE users 
         SET username = $1
         WHERE id = $2`,
        [username, userId]
      );

      // If password change is requested
      if (current_password && new_password) {
        // Verify current password
        const { rows } = await client.query(
          'SELECT password FROM users WHERE id = $1',
          [userId]
        );

        const validPassword = await bcrypt.compare(current_password, rows[0].password);
        if (!validPassword) {
          throw new Error('Current password is incorrect');
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await client.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [hashedPassword, userId]
        );
      }

      await client.query('COMMIT');

      // Update session
      req.session.user = {
        ...req.session.user,
        username,
      };

      res.redirect('/profile');
      // Get updated user data
      const { rows } = await pool.query(
        `SELECT id, username, email, role, created_at FROM users WHERE id = $1`,
        [userId]
      );

      res.render('layout', {
        user: rows[0],
        success: 'Profile updated successfully',
        title: 'My Profile',
        body: 'profile'
      });

      req.session.user = rows[0];
      res.redirect('/profile');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.render('layout', {
      user: req.session.user,
      error: err.message,
      title: 'My Profile',
      body: 'profile'
    });
  }
});

export default router;
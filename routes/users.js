// routes/users.js
import express from "express";
import { pool } from "../db/index.js";
import bcrypt from "bcrypt";
import { requireLogin, requireAdmin } from "../middleware/auth.js";

const router = express.Router();


// View user list
router.get("/users", requireLogin, requireAdmin, async (req, res) => {
  const result = await pool.query(
    "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC"
  );
  res.render("layout", { 
    users: result.rows,
    title: 'User List',
    body: 'users'
   });
});

// Show signup form
router.get("/users/new", requireLogin, requireAdmin, (req, res) => {
  res.render("layout", { 
    error: null,
    title: 'Create New User',
    body: 'signup' 

  });
});

// Handle signup
router.post("/users/new", requireLogin, requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)",
      [username, email, hashed, role || "staff"]
    );
    res.redirect("/users/new");
  } catch (err) {
    console.error(err);
    res.render("layout", {
      error: "Failed to create user. Email might already exist.",
      title: 'Create New User',
      body: 'signup',
    });
  }
});

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
    const { username, email, current_password, new_password } = req.body;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update basic info
      await client.query(
        `UPDATE users 
         SET username = $1, email = $2
         WHERE id = $3`,
        [username, email, userId]
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
        email
      };

      // Get updated user data
      const { rows } = await pool.query(
        `SELECT id, username, email, role, created_at 
         FROM users WHERE id = $1`,
        [userId]
      );

      res.render('layout', {
        user: rows[0],
        success: 'Profile updated successfully!',
        title: 'My Profile',
        body: 'profile'
      });
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

// Delete user
router.post(
  "/users/:id/delete",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.session.user.id) {
      return res.send("You can't delete your own account.");
    }

    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    res.redirect("/users");
  }
);

// Show edit form
router.get("/users/:id/edit", requireLogin, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const result = await pool.query(
    "SELECT id, username, email, role FROM users WHERE id = $1",
    [userId]
  );

  res.render("layout", { 
    user: result.rows[0], 
    error: null,
    title: 'Edit User',
    body: 'edit-user'
  });
});

// Handle edit form
router.post("/users/:id/edit", requireLogin, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { username, email, role } = req.body;

  try {
    await pool.query(
      "UPDATE users SET username = $1, email = $2, role = $3 WHERE id = $4",
      [username, email, role, userId]
    );
    res.redirect("/users");
  } catch (err) {
    console.error(err);
    res.render("layout", {
      user: { id: userId, username, email, role },
      error: "Error updating user",
      title: 'Edit User',
      body: 'edit-user'
    });
  }
});

export default router;

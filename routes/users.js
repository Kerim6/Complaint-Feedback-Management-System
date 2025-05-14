// routes/users.js
import express from "express";
import { pool } from "../db/index.js";
import bcrypt from "bcrypt";
import { requireLogin, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

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

// Delete user
router.post(
  "/users/:id/delete",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.session.user_id) {
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

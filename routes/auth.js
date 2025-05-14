// routes/auth.js
import express from "express";
import { pool } from "../db/index.js";
import bcrypt from "bcrypt";
import session from "express-session";

const router = express.Router();

// Login form
router.get("/", (req, res) => {
  res.render("login", { error: null });
});

// Login submission
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user) {
      return res.render("login", { error: "Invalid email or password" });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.render("login", { error: "Invalid email or password" });
    }
    req.session.user = {
      id: user.id,
      role: user.role,
      username: user.username,
    };

    // Redirect based on role
    if (user.role === 'admin') {
      return res.redirect("/admin/complaints");
    } else {
    res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Something went wrong. Please try again." });
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export default router;

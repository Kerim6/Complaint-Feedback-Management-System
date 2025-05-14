import express from "express";
import { pool } from "../db/index.js";
import bcrypt from "bcrypt";
import { requireLogin, requireAdmin, addWorkingDays } from "../middleware/auth.js";


const router = express.Router();

// View all complaints (admin only)
router.get(
  "/admin/complaints",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    const complaints = await pool.query(`
          SELECT 
      c.id,
      c.created_at,
      c.tracking_id,
      c.name,
      genders.name AS gender,
      c.age,
      c.phone,
      c.email,
      governorates.name AS governorate,
      districts.name AS district,
      sub_districts.name AS sub_district,
      communities.name AS community,
      c.village_camp_facility,
      p.short_name AS project_short_name,
      p.donor AS project_donor,
      p.code AS project_code,
      p.sector AS project_sector,
      categories.name AS category,
      a.follow_up AS follow_up,
      a.status AS status,
      a.sensitive AS sensitive,
      attachments.file_path AS attachment,
      assigned_user.username AS assigned_to,
      channels.name AS channel,
      c.activity,
      c.complaint,
      r.response_text AS response,
      r.created_at AS response_date,
      a.referral_date AS referral_date
    FROM complaints c
    LEFT JOIN responses r ON c.id = r.complaint_id
    
    LEFT JOIN attachments ON c.id = attachments.complaint_id
    LEFT JOIN governorates ON c.governorate_id = governorates.id
    LEFT JOIN districts ON c.district_id = districts.id
    LEFT JOIN sub_districts ON c.sub_district_id = sub_districts.id
    LEFT JOIN communities ON c.community_id = communities.id
    LEFT JOIN genders ON c.gender_id = genders.id
    LEFT JOIN assignments a ON a.complaint_id = c.id
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN channels ON a.channel_id = channels.id
    LEFT JOIN categories ON a.category_id = categories.id
    LEFT JOIN users assigned_user ON assigned_user.id = a.user_id
    ORDER BY c.created_at DESC
    `);

    res.render("layout", {
      complaints: complaints.rows,
      title: "All Complaints",
      body: "admin-complaints",
    });
  }
);

// Show form to assign a complaint (admin only)
router.get(
  "/admin/complaints/:id/assign",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    const complaintId = req.params.id;

    // Check if already assigned
    const assignment = await pool.query(
      "SELECT * FROM assignments WHERE complaint_id = $1",
      [complaintId]
    );

    if (assignment.rows.length > 0) {
      // Already assigned
      return res.redirect("/admin/complaints");
    }

    // Get users for assignment
    const users = await pool.query(
      "SELECT id, username, role FROM users WHERE role IN ('staff', 'manager') ORDER BY role, username"
    );

    // Get projects for assignment
    const projects = await pool.query(
      "SELECT id, short_name, donor, code, sector FROM projects"
    );

    // Get channel for assignment
    const channels = await pool.query("SELECT id, name FROM channels");

    const complaint = await pool.query(
      "SELECT * FROM complaints WHERE id = $1",
      [complaintId]
    );

    const categories = await pool.query("SELECT id, name FROM categories");
    res.render("layout", {
      complaintId,
      projects: projects.rows,
      channels: channels.rows,
      users: users.rows,
      complaint: complaint.rows[0],
      categories: categories.rows,
      error: null,
      title: "Assign Complaint",
      body: "assign-complaint",
    });
  }
);

// Assign the complaint
router.post(
  "/admin/complaints/:id/assign",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    const complaintId = req.params.id;
    const { user_id, project_id, channel_id, category_id, follow_up, status, sensitive } = req.body;

    // Get working_days_limit from categories table
    const {rows: categoriesRows} = await pool.query(
      "SELECT working_days_limit FROM categories WHERE id = $1",
      [category_id]
    );
    const workingDaysLimit = categoriesRows[0].working_days_limit || 5; 
    const referralDate = new Date();
    const dueDate = addWorkingDays(referralDate, workingDaysLimit);


    try {
      await pool.query(
        `
        INSERT INTO assignments (complaint_id, user_id, project_id, channel_id, category_id, referral_date, due_date, follow_up, status, sensitive)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
        [complaintId, user_id, project_id, channel_id, category_id, referralDate, dueDate, follow_up, status, sensitive]
      );

      res.redirect("/admin/complaints");
    } catch (err) {
      console.error(err);
      res.render("layout", {
        complaint: { id: complaintId, tracking_id: "" },
        users: [],
        categories: [],
        error: "Failed to assign complaint.",
        title: "Assign Complaint",
        body: "assign-complaint",
      });
    }
  }
);

export default router;

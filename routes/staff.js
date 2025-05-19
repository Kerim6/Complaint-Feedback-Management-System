import express from "express";
import { pool } from "../db/index.js";
import { requireLogin, requireStaff } from "../middleware/auth.js";
import session from "express-session";

const router = express.Router();

router.get("/dashboard", requireLogin, requireStaff, async (req, res) => {
  const userId = req.session.user?.id;

  const complaints = await pool.query(
    `
    SELECT 
      c.id,
      c.created_at,
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
      a.sensitive,
      a.referral_date AS referral_date,
      a.follow_up AS follow_up,
      c.activity,
      c.complaint,
      r.response_text,
      r.response_date

    FROM complaints c
    INNER JOIN assignments a ON a.complaint_id = c.id
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN governorates ON c.governorate_id = governorates.id
    LEFT JOIN districts ON c.district_id = districts.id
    LEFT JOIN sub_districts ON c.sub_district_id = sub_districts.id
    LEFT JOIN communities ON c.community_id = communities.id
    LEFT JOIN categories ON a.category_id = categories.id
    LEFT JOIN responses r ON r.complaint_id = c.id AND r.user_id = $1

    
    WHERE a.user_id = $1
    ORDER BY c.created_at DESC
  `,
    [userId]
  );

  if (complaints.rows.length === 0) {
    return res.status(404).send("Complaint not found");
  }

  
  res.render("layout", {
    complaints: complaints.rows,
    session: req.session,
    title: "Staff Dashboard",
    body: "staff-dashboard",
  });
});

// Route to view specific complaint details
router.get("/complaint/:id", requireLogin, requireStaff, async (req, res) => {
  const complaintId = req.params.id;
  const userId = req.session.user?.id;

  const complaint = await pool.query(
    `
    SELECT 
      c.id,
      c.tracking_id,
      c.name,
      c.created_at,
      p.title AS project,
      a.status,
      a.follow_up
    FROM complaints c
    INNER JOIN assignments a ON a.complaint_id = c.id
    LEFT JOIN projects p ON c.project_id = p.id
    WHERE a.user_id = $1 AND c.id = $2
  `,
    [userId, complaintId]
  );

  if (complaint.rows.length === 0) {
    return res.status(404).send("Complaint not found");
  }

  const response = await pool.query(
    `
    SELECT 
*    FROM responses WHERE complaint_id = $1 and user_id = $2`,
    [complaintId, userId]
  );

  res.render("layout", {
    complaint: complaint.rows[0],
    response: response.rows[0] || null,
    session: req.session,
    title: "Complaint Details",
    body: "staff-complaint-details",
  });
});

// Route to respond to a complaint
router.post("/respond", requireLogin, requireStaff, async (req, res) => {
  const { complaint_id, response_text } = req.body;
  const userId = req.session.user?.id;

  // 1. Check if this complaint is assigned to this user
  const assignment = await pool.query(
    `SELECT * FROM assignments WHERE complaint_id = $1 AND user_id = $2`,
    [complaint_id, userId]
  );

  if (assignment.rows.length === 0) {
    return res.status(403).send("You are not assigned to this complaint.");
  }

  // 2. Check if this user already responded
  const existingResponse = await pool.query(
    `SELECT * FROM responses WHERE complaint_id = $1 AND user_id = $2`,
    [complaint_id, userId]
  );

  if (existingResponse.rows.length > 0) {
    return res
      .status(400)
      .send("You have already submitted a response for this complaint.");
  }

  // 3. Save the response
  await pool.query(
    `INSERT INTO responses (complaint_id, user_id, response_text)
     VALUES ($1, $2, $3)`,
    [complaint_id, userId, response_text]
  );

  // 4. Optionally update assignment status
  await pool.query(
    `UPDATE assignments
     SET status = 'resolved'
     WHERE complaint_id = $1 AND user_id = $2`,
    [complaint_id, userId]
  );

  res.redirect("/dashboard");
});

export default router;

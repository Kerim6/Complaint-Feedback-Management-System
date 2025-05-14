import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import {pool} from '../db/index.js';

const router = express.Router();

// View complaint details
router.get('/complaints/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const complaintQuery = `
      SELECT c.*, g.name AS gender, ch.name AS channel, p.title AS project, 
             gov.name AS governorate, d.name AS district, s.name AS sub_district, com.name AS community
      FROM complaints c
      LEFT JOIN genders g ON c.gender_id = g.id
      LEFT JOIN channels ch ON c.channel_id = ch.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN governorates gov ON c.governorate_id = gov.id
      LEFT JOIN districts d ON c.district_id = d.id
      LEFT JOIN sub_districts s ON c.sub_district_id = s.id
      LEFT JOIN communities com ON c.community_id = com.id
      WHERE c.id = $1
    `;

    const result = await pool.query(complaintQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Complaint not found');
    }

    const complaint = result.rows[0];

    // Get response if any
    const responseRes = await pool.query(
      `SELECT r.*, u.username FROM responses r LEFT JOIN users u ON r.user_id = u.id WHERE complaint_id = $1`,
      [id]
    );

    const response = responseRes.rows[0] || null;

    // Get assignment
    const assignmentRes = await pool.query(
      `SELECT a.*, u.username AS assigned_to FROM assignments a 
       LEFT JOIN users u ON a.user_id = u.id WHERE complaint_id = $1`,
      [id]
    );

    const assignment = assignmentRes.rows[0] || null;

    res.render('layout', {
      complaint,
      response,
      assignment,
      title: 'Complaint Details',
      body: 'complaint-details'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;

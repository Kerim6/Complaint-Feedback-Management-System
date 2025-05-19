import express from 'express';
import {pool} from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  dest: './public/uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed!'));
    }
  }
});
const upload = multer({ storage });

// GET: Complaint form
router.get('/submit', async (req, res) => {
  const genders = await pool.query('SELECT * FROM genders');
  const channels = await pool.query('SELECT * FROM channels');
  const projects = await pool.query('SELECT * FROM projects');
  const governorates = await pool.query('SELECT * FROM governorates');

  res.render('public/complaint-form', {
    genders: genders.rows,
    channels: channels.rows,
    projects: projects.rows,
    governorates: governorates.rows,
  });
});

// POST: Submit complaint
router.post('/submit', upload.single('attachment'), async (req, res) => {
  const {
    name, gender_id, age, phone, email,
    governorate_id, district_id, sub_district_id, community_id,
    village_camp_facility, activity, complaint, channel_id, project_id
  } = req.body;

  const tracking_id = uuidv4().split('-')[0]; // Short unique ID
  const attachment = req.file ? req.file.filename : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert complaint and get the complaint id
    const complaintResult = await client.query(`
      INSERT INTO complaints (
        tracking_id, name, gender_id, age, phone, email,
        governorate_id, district_id, sub_district_id, community_id,
        village_camp_facility, activity, complaint, channel_id, project_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      RETURNING id
    `, [
      tracking_id, name, gender_id || null, age || null, phone, email,
      governorate_id || null, district_id || null, sub_district_id || null, community_id || null,
      village_camp_facility, activity, complaint, channel_id || null, project_id || null
    ]);

    const complaintId = complaintResult.rows[0].id;

    // Insert into attachments if file uploaded
    if (attachment) {
      await client.query(`
        INSERT INTO attachments (complaint_id, file_path)
        VALUES ($1, $2)
      `, [complaintId, attachment]);
    }

    await client.query('COMMIT');

    res.render('public/thank-you', { tracking_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Something went wrong.');
  } finally {
    client.release();
  }
});


// Fetch districts by governorate
router.get('/api/districts/:governorateId', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name FROM districts WHERE governorate_id = $1',
    [req.params.governorateId]
  );
  res.json(result.rows);
});

// Fetch sub-districts by district
router.get('/api/sub-districts/:districtId', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name FROM sub_districts WHERE district_id = $1',
    [req.params.districtId]
  );
  res.json(result.rows);
});

// Fetch communities by sub-district
router.get('/api/communities/:subDistrictId', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name FROM communities WHERE sub_district_id = $1',
    [req.params.subDistrictId]
  );
  res.json(result.rows);
});

// Show tracking page
router.get('/track', (req, res) => {
    res.render('public/track-form', {
        complaint: null,
        error: null
    });
});

// Handle tracking form submission
router.post('/track', async (req, res) => {
  const { tracking_id } = req.body;

  try {
    const result = await pool.query(
      `SELECT c.tracking_id, c.name, c.phone, c.created_at,
              a.status, a.follow_up, a.sensitive, u.username AS assigned_to,
              r.response_text, r.created_at AS response_date
       FROM complaints c
       LEFT JOIN assignments a ON c.id = a.complaint_id
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN responses r ON c.id = r.complaint_id
       WHERE c.tracking_id = $1`,
      [tracking_id]
    );

    if (result.rows.length === 0) {
      return res.render('public/track-form', {
        complaint: null,
        error: 'No complaint found with this Tracking ID.',
      });
    }

    const complaint = result.rows[0];
    res.render('public/track-form', { complaint, error: null });

  } catch (err) {
    console.error(err);
    res.render('public/track-form', {
      complaint: null,
      error: 'Something went wrong. Please try again.',
    });
  }
});

export default router;

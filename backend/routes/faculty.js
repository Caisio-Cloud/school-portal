const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Faculty-only access
router.use(requireAuth, requireRole(['Faculty']));

// Get faculty dashboard data
router.get('/dashboard', (req, res) => {
  const facultyId = req.session.userId;

  Promise.all([
    // Get active attendance session
    new Promise((resolve) => {
      db.get(`
        SELECT * FROM AttendanceSessions 
        WHERE facultyId = ? AND isActive = 1 
        AND datetime(expiresAt) > datetime('now')
      `, [facultyId], (err, session) => {
        resolve(session || null);
      });
    }),
    // Get assignments
    new Promise((resolve) => {
      db.all(`
        SELECT a.*, COUNT(s.id) as submissions
        FROM Assignments a
        LEFT JOIN AssignmentSubmissions s ON a.id = s.assignmentId
        WHERE a.facultyId = ?
        GROUP BY a.id
        ORDER BY a.createdAt DESC
      `, [facultyId], (err, assignments) => {
        resolve(assignments || []);
      });
    }),
    // Get submissions to grade
    new Promise((resolve) => {
      db.all(`
        SELECT s.*, a.title as assignmentTitle, u.fullName as studentName
        FROM AssignmentSubmissions s
        JOIN Assignments a ON s.assignmentId = a.id
        JOIN Users u ON s.studentId = u.id
        WHERE a.facultyId = ? AND s.status = 'Submitted'
        ORDER BY s.submittedAt
      `, [facultyId], (err, submissions) => {
        resolve(submissions || []);
      });
    }),
    // Get materials
    new Promise((resolve) => {
      db.all(`
        SELECT * FROM LearningMaterials 
        WHERE facultyId = ?
        ORDER BY uploadDate DESC
      `, [facultyId], (err, materials) => {
        resolve(materials || []);
      });
    })
  ])
  .then(([attendanceSession, assignments, submissions, materials]) => {
    res.json({
      attendanceSession,
      assignments,
      submissions,
      materials
    });
  })
  .catch(err => {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  });
});

// Start attendance session
router.post('/attendance/start', [
  body('grade').notEmpty(),
  body('section').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const facultyId = req.session.userId;
  const { grade, section } = req.body;
  
  // Generate session code
  const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Check for existing active session
  db.get(`
    SELECT * FROM AttendanceSessions 
    WHERE facultyId = ? AND isActive = 1 
    AND datetime(expiresAt) > datetime('now')
  `, [facultyId], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: 'You already have an active session' });
    }

    db.run(
      `INSERT INTO AttendanceSessions (sessionCode, facultyId, grade, section, expiresAt, isActive)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [sessionCode, facultyId, grade, section, expiresAt.toISOString()],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({
          message: 'Attendance session started',
          sessionCode,
          expiresAt
        });
      }
    );
  });
});

// End attendance session
router.post('/attendance/end', (req, res) => {
  const facultyId = req.session.userId;

  db.run(
    'UPDATE AttendanceSessions SET isActive = 0 WHERE facultyId = ? AND isActive = 1',
    [facultyId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Attendance session ended' });
    }
  );
});

// Create assignment
router.post('/assignments', [
  body('title').notEmpty(),
  body('grade').notEmpty(),
  body('section').notEmpty(),
  body('dueDate').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const facultyId = req.session.userId;
  const { title, description, grade, section, dueDate } = req.body;

  db.run(
    `INSERT INTO Assignments (title, description, grade, section, facultyId, dueDate)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description, grade, section, facultyId, dueDate],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ 
        message: 'Assignment created successfully',
        assignmentId: this.lastID 
      });
    }
  );
});

// Grade submission
router.post('/submissions/:id/grade', [
  body('grade').isInt({ min: 0, max: 100 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { grade } = req.body;

  db.run(
    `UPDATE AssignmentSubmissions 
     SET grade = ?, status = 'Graded' 
     WHERE id = ?`,
    [grade, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Also update student's grades table
      db.get(
        `SELECT studentId, assignmentId FROM AssignmentSubmissions WHERE id = ?`,
        [id],
        (err, submission) => {
          if (submission) {
            const remarks = grade >= 75 ? 'Passed' : 'Failed';
            db.run(
              `INSERT OR REPLACE INTO Grades (studentId, subject, score, remarks, gradedBy)
               VALUES (?, 'Assignment', ?, ?, ?)`,
              [submission.studentId, grade, remarks, req.session.userId]
            );
          }
        }
      );
      
      res.json({ message: 'Submission graded successfully' });
    }
  );
});

// Upload learning material
router.post('/materials', [
  body('title').notEmpty(),
  body('grade').notEmpty(),
  body('section').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const facultyId = req.session.userId;
  const { title, description, grade, section } = req.body;
  
  // In a real app, you'd handle file upload here
  // For simplicity, we'll assume filename and path are provided
  const filename = req.body.filename || 'document.pdf';
  const filepath = req.body.filepath || '/uploads/' + filename;

  db.run(
    `INSERT INTO LearningMaterials (title, description, filename, filepath, grade, section, facultyId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description, filename, filepath, grade, section, facultyId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ 
        message: 'Material uploaded successfully',
        materialId: this.lastID 
      });
    }
  );
});

module.exports = router;

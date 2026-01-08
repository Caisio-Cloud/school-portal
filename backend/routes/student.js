const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// Student-only access
router.use(requireAuth, requireRole(['Student']));

// Get student dashboard data
router.get('/dashboard', (req, res) => {
  const studentId = req.session.userId;
  const grade = req.session.grade;
  const section = req.session.section;

  // Get assignments
  db.all(`
    SELECT a.*, s.status as submissionStatus, s.grade as submissionGrade
    FROM Assignments a
    LEFT JOIN AssignmentSubmissions s ON a.id = s.assignmentId AND s.studentId = ?
    WHERE a.grade = ? AND a.section = ?
    ORDER BY a.dueDate
  `, [studentId, grade, section], (err, assignments) => {
    if (err) {
      console.error(err);
      assignments = [];
    }

    // Get quizzes
    db.all(`
      SELECT * FROM Quizzes 
      WHERE grade = ? AND section = ?
      ORDER BY createdAt DESC
    `, [grade, section], (err, quizzes) => {
      if (err) {
        console.error(err);
        quizzes = [];
      }

      // Get grades
      db.all(`
        SELECT subject, score, remarks 
        FROM Grades 
        WHERE studentId = ?
        ORDER BY createdAt DESC
      `, [studentId], (err, grades) => {
        if (err) {
          console.error(err);
          grades = [];
        }

        // Get materials
        db.all(`
          SELECT * FROM LearningMaterials 
          WHERE grade = ? AND section = ?
          ORDER BY uploadDate DESC
        `, [grade, section], (err, materials) => {
          if (err) {
            console.error(err);
            materials = [];
          }

          // Check active attendance session
          db.get(`
            SELECT * FROM AttendanceSessions 
            WHERE grade = ? AND section = ? AND isActive = 1 
            AND datetime(expiresAt) > datetime('now')
          `, [grade, section], (err, session) => {
            if (err) {
              console.error(err);
              session = null;
            }

            res.json({
              assignments,
              quizzes,
              grades,
              materials,
              attendanceSession: session
            });
          });
        });
      });
    });
  });
});

// Submit assignment
router.post('/assignments/:id/submit', (req, res) => {
  const { id } = req.params;
  const studentId = req.session.userId;
  const { submission } = req.body;

  db.run(
    `INSERT OR REPLACE INTO AssignmentSubmissions (assignmentId, studentId, submission, status)
     VALUES (?, ?, ?, 'Submitted')`,
    [id, studentId, submission],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ message: 'Assignment submitted successfully' });
    }
  );
});

// Sign attendance
router.post('/attendance/sign', (req, res) => {
  const studentId = req.session.userId;
  const grade = req.session.grade;
  const section = req.session.section;
  const { sessionCode } = req.body;

  // Verify session is active
  db.get(`
    SELECT * FROM AttendanceSessions 
    WHERE sessionCode = ? AND grade = ? AND section = ? 
    AND isActive = 1 AND datetime(expiresAt) > datetime('now')
  `, [sessionCode, grade, section], (err, session) => {
    if (err || !session) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }

    // Check if already signed
    db.get(`
      SELECT * FROM AttendanceRecords 
      WHERE sessionId = ? AND studentId = ?
    `, [session.id, studentId], (err, record) => {
      if (record) {
        return res.status(400).json({ error: 'Attendance already recorded' });
      }

      // Record attendance
      db.run(
        'INSERT INTO AttendanceRecords (sessionId, studentId) VALUES (?, ?)',
        [session.id, studentId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ message: 'Attendance signed successfully' });
        }
      );
    });
  });
});

module.exports = router;

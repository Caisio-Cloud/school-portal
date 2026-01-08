const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// Admin-only access
router.use(requireAuth, requireRole(['Admin']));

// Get all users
router.get('/users', (req, res) => {
  db.all(`
    SELECT id, fullName, username, accountType, status, grade, section, lrn, 
           strftime('%Y-%m-%d %H:%M:%S', createdAt) as createdAt
    FROM Users 
    WHERE accountType != 'Admin'
    ORDER BY createdAt DESC
  `, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

// Update user status
router.put('/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    'UPDATE Users SET status = ? WHERE id = ?',
    [status, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'Status updated successfully' });
    }
  );
});

// Get dashboard stats
router.get('/dashboard', (req, res) => {
  Promise.all([
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM Users WHERE accountType = "Student"', (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    }),
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM Users WHERE accountType = "Faculty"', (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    }),
    new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as total FROM Users WHERE status = "Pending"', (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    })
  ])
  .then(([students, faculty, pending]) => {
    res.json({
      stats: {
        students,
        faculty,
        pending
      }
    });
  })
  .catch(err => {
    res.status(500).json({ error: 'Database error' });
  });
});

module.exports = router;

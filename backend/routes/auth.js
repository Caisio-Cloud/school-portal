const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { body, validationResult } = require('express-validator');

// Registration
router.post('/register', [
  body('fullName').notEmpty().trim(),
  body('accountType').isIn(['Student', 'Faculty']),
  body('username').isLength({ min: 3 }).custom((value) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM Users WHERE username = ?', [value], (err, row) => {
        if (row) {
          reject(new Error('Username already exists'));
        } else {
          resolve(true);
        }
      });
    });
  }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, accountType, username, password, grade, section, lrn } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO Users (fullName, accountType, username, password, status, grade, section, lrn)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
    `;
    
    db.run(query, [fullName, accountType, username, hashedPassword, grade, section, lrn], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Set flash message for pending approval
      req.flash('info', 'Registration submitted successfully. Please wait for admin approval before logging in.');
      res.status(201).json({ 
        message: 'Registration successful. Pending admin approval.',
        userId: this.lastID 
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  db.get('SELECT * FROM Users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check status
    if (user.status === 'Pending') {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }

    if (user.status === 'Rejected') {
      return res.status(403).json({ error: 'Account rejected. Please contact admin.' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.accountType = user.accountType;
    req.session.fullName = user.fullName;
    
    if (user.accountType === 'Student') {
      req.session.grade = user.grade;
      req.session.section = user.section;
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        accountType: user.accountType,
        grade: user.grade,
        section: user.section
      }
    });
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Check authentication
router.get('/check', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        fullName: req.session.fullName,
        accountType: req.session.accountType,
        grade: req.session.grade,
        section: req.session.section
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;

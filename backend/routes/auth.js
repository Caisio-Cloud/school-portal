const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const router = express.Router();

module.exports = (pool) => {
  
  // Registration
  router.post('/register', [
    body('fullName').notEmpty().trim(),
    body('accountType').isIn(['Student', 'Faculty']),
    body('username').isLength({ min: 3 }),
    body('password').isLength({ min: 6 })
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, accountType, username, password, grade, section, lrn } = req.body;

    try {
      // Check if username exists
      const existing = await pool.query(
        'SELECT id FROM Users WHERE username = $1',
        [username]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(
        `INSERT INTO Users (fullName, accountType, username, password, status, grade, section, lrn)
         VALUES ($1, $2, $3, $4, 'Pending', $5, $6, $7)
         RETURNING id`,
        [fullName, accountType, username, hashedPassword, grade, section, lrn]
      );
      
      req.flash('info', 'Registration submitted successfully. Please wait for admin approval before logging in.');
      res.status(201).json({ 
        message: 'Registration successful. Pending admin approval.',
        userId: result.rows[0].id 
      });
    } catch (error) {
      console.error('Registration error:', error);
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

    try {
      const result = await pool.query(
        'SELECT * FROM Users WHERE username = $1',
        [username]
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status === 'Pending') {
        return res.status(403).json({ error: 'Account pending admin approval' });
      }

      if (user.status === 'Rejected') {
        return res.status(403).json({ error: 'Account rejected. Please contact admin.' });
      }

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
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
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
  router.get('/check', async (req, res) => {
    if (req.session.userId) {
      try {
        const result = await pool.query(
          'SELECT id, fullName, accountType, grade, section FROM Users WHERE id = $1',
          [req.session.userId]
        );
        
        if (result.rows[0]) {
          res.json({
            authenticated: true,
            user: result.rows[0]
          });
        } else {
          res.json({ authenticated: false });
        }
      } catch (error) {
        res.json({ authenticated: false });
      }
    } else {
      res.json({ authenticated: false });
    }
  });

  return router;
};

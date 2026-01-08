require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware - CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://snnhsportal.netlify.app', 'http://localhost:3000']
    : 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for Railway
const sessionConfig = {
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || 'school-portal-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

app.use(session(sessionConfig));
app.use(flash());

// Database initialization
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        fullName TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        accountType TEXT CHECK(accountType IN ('Student', 'Faculty', 'Admin')) NOT NULL,
        status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
        grade TEXT,
        section TEXT,
        lrn TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Assignments (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        dueDate TIMESTAMP NOT NULL,
        grade TEXT NOT NULL,
        section TEXT NOT NULL,
        facultyId INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facultyId) REFERENCES Users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS AssignmentSubmissions (
        id SERIAL PRIMARY KEY,
        assignmentId INTEGER NOT NULL,
        studentId INTEGER NOT NULL,
        submission TEXT,
        submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Pending',
        grade INTEGER,
        FOREIGN KEY (assignmentId) REFERENCES Assignments(id),
        FOREIGN KEY (studentId) REFERENCES Users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Quizzes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        grade TEXT NOT NULL,
        section TEXT NOT NULL,
        facultyId INTEGER NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facultyId) REFERENCES Users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS AttendanceSessions (
        id SERIAL PRIMARY KEY,
        sessionCode TEXT UNIQUE NOT NULL,
        facultyId INTEGER NOT NULL,
        grade TEXT NOT NULL,
        section TEXT NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facultyId) REFERENCES Users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS AttendanceRecords (
        id SERIAL PRIMARY KEY,
        sessionId INTEGER NOT NULL,
        studentId INTEGER NOT NULL,
        signedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES AttendanceSessions(id),
        FOREIGN KEY (studentId) REFERENCES Users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Grades (
        id SERIAL PRIMARY KEY,
        studentId INTEGER NOT NULL,
        subject TEXT NOT NULL,
        score INTEGER NOT NULL,
        remarks TEXT,
        gradedBy INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES Users(id),
        FOREIGN KEY (gradedBy) REFERENCES Users(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS LearningMaterials (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        grade TEXT NOT NULL,
        section TEXT NOT NULL,
        facultyId INTEGER NOT NULL,
        uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facultyId) REFERENCES Users(id)
      )
    `);

    // Seed admin user if not exists
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(`
      INSERT INTO Users (fullName, username, password, accountType, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
    `, ['System Administrator', 'admin', hashedPassword, 'Admin', 'Approved']);

    console.log('✅ Database tables created/verified');
    console.log('✅ Admin user seeded (username: admin, password: admin123)');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// SIMPLE ROUTES FOR TESTING - Replace with actual routes later
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple auth routes for testing
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
      req.session.userId = 1;
      req.session.accountType = 'Admin';
      req.session.fullName = 'System Administrator';
      
      return res.json({
        message: 'Login successful',
        user: {
          id: 1,
          fullName: 'System Administrator',
          accountType: 'Admin'
        }
      });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, accountType, username, password, grade, section, lrn } = req.body;
    
    // Simple validation
    if (!fullName || !accountType || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    res.status(201).json({ 
      message: 'Registration submitted. Pending admin approval.',
      data: { fullName, accountType, username }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        fullName: req.session.fullName,
        accountType: req.session.accountType
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// Admin routes (simple version)
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, fullName, username, accountType, status FROM Users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'School Portal API',
    status: 'Running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        check: 'GET /api/auth/check',
        logout: 'POST /api/auth/logout'
      },
      admin: 'GET /api/admin/users',
      health: 'GET /api/health'
    },
    adminCredentials: {
      username: 'admin',
      password: 'admin123'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

// Initialize and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    // FIXED: Added '0.0.0.0' for Docker/container compatibility
    app.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(50));
      console.log(`✅ School Portal Backend Started Successfully`);
      console.log('='.repeat(50));
      console.log(`📡 Server URL: http://0.0.0.0:${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔧 Port: ${PORT}`);
      console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected ✅' : 'Not configured ❌'}`);
      console.log(`🔑 Session Secret: ${process.env.SESSION_SECRET ? 'Set ✅' : 'Not set ⚠️'}`);
      console.log('='.repeat(50));
      console.log(`👤 Admin Login:`);
      console.log(`   Username: admin`);
      console.log(`   Password: admin123`);
      console.log('='.repeat(50));
      console.log(`📊 Endpoints:`);
      console.log(`   Health Check: http://0.0.0.0:${PORT}/api/health`);
      console.log(`   API Root: http://0.0.0.0:${PORT}/`);
      console.log(`   Admin Login: POST http://0.0.0.0:${PORT}/api/auth/login`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://school-portal.netlify.app', 'http://localhost:3000']
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

    console.log('Database tables created/verified');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Import routes
const authRoutes = require('./routes/auth')(pool);
const adminRoutes = require('./routes/admin')(pool);
const studentRoutes = require('./routes/student')(pool);
const facultyRoutes = require('./routes/faculty')(pool);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'School Portal API',
    status: 'Running',
    documentation: '/api/[auth|admin|student|faculty]'
  });
});

const PORT = process.env.PORT || 5000;

// Initialize and start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  });
}

startServer().catch(console.error);

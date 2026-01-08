const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'school-portal.db'));

// Create tables
const createTables = () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      accountType TEXT CHECK(accountType IN ('Student', 'Faculty', 'Admin')) NOT NULL,
      status TEXT CHECK(status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
      grade TEXT,
      section TEXT,
      lrn TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS Assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      dueDate DATETIME NOT NULL,
      grade TEXT NOT NULL,
      section TEXT NOT NULL,
      facultyId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (facultyId) REFERENCES Users(id)
    )
  `);

  // AssignmentSubmissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS AssignmentSubmissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignmentId INTEGER NOT NULL,
      studentId INTEGER NOT NULL,
      submission TEXT,
      submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Pending',
      grade INTEGER,
      FOREIGN KEY (assignmentId) REFERENCES Assignments(id),
      FOREIGN KEY (studentId) REFERENCES Users(id)
    )
  `);

  // Quizzes table
  db.run(`
    CREATE TABLE IF NOT EXISTS Quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      grade TEXT NOT NULL,
      section TEXT NOT NULL,
      facultyId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (facultyId) REFERENCES Users(id)
    )
  `);

  // AttendanceSessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS AttendanceSessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionCode TEXT UNIQUE NOT NULL,
      facultyId INTEGER NOT NULL,
      grade TEXT NOT NULL,
      section TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      isActive BOOLEAN DEFAULT true,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (facultyId) REFERENCES Users(id)
    )
  `);

  // AttendanceRecords table
  db.run(`
    CREATE TABLE IF NOT EXISTS AttendanceRecords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId INTEGER NOT NULL,
      studentId INTEGER NOT NULL,
      signedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sessionId) REFERENCES AttendanceSessions(id),
      FOREIGN KEY (studentId) REFERENCES Users(id)
    )
  `);

  // Grades table
  db.run(`
    CREATE TABLE IF NOT EXISTS Grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      subject TEXT NOT NULL,
      score INTEGER NOT NULL,
      remarks TEXT,
      gradedBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentId) REFERENCES Users(id),
      FOREIGN KEY (gradedBy) REFERENCES Users(id)
    )
  `);

  // LearningMaterials table
  db.run(`
    CREATE TABLE IF NOT EXISTS LearningMaterials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      grade TEXT NOT NULL,
      section TEXT NOT NULL,
      facultyId INTEGER NOT NULL,
      uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (facultyId) REFERENCES Users(id)
    )
  `);
};

// Initialize database
db.serialize(() => {
  createTables();
});

module.exports = db;

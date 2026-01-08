const bcrypt = require('bcryptjs');
const db = require('./config/database');

const seedAdmin = async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = {
    fullName: 'System Administrator',
    username: 'admin',
    password: hashedPassword,
    accountType: 'Admin',
    status: 'Approved'
  };

  db.run(
    `INSERT OR IGNORE INTO Users (fullName, username, password, accountType, status) 
     VALUES (?, ?, ?, ?, ?)`,
    [admin.fullName, admin.username, admin.password, admin.accountType, admin.status],
    function(err) {
      if (err) {
        console.error('Error seeding admin:', err);
      } else {
        if (this.changes > 0) {
          console.log('Admin account seeded successfully');
        } else {
          console.log('Admin account already exists');
        }
      }
    }
  );
};

seedAdmin();

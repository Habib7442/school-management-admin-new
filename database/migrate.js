#!/usr/bin/env node

/**
 * Database Migration Script for School Management System
 * 
 * This script helps set up the database schema and RLS policies
 * Run with: node migrate.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readSQLFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filename}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

async function runMigration() {
  log('🚀 School Management System Database Migration', 'cyan');
  log('================================================', 'cyan');
  
  try {
    // Check if required files exist
    log('\n📋 Checking migration files...', 'yellow');
    
    const schemaSQL = readSQLFile('schema.sql');
    log('✅ schema.sql found', 'green');
    
    const rlsSQL = readSQLFile('rls-policies.sql');
    log('✅ rls-policies.sql found', 'green');
    
    log('\n📖 Migration Instructions:', 'bright');
    log('==========================', 'bright');
    
    log('\n1. 🌐 Open your Supabase Dashboard:', 'blue');
    log('   https://supabase.com/dashboard', 'cyan');
    
    log('\n2. 📊 Navigate to SQL Editor:', 'blue');
    log('   Project → SQL Editor → New Query', 'cyan');
    
    log('\n3. 🗄️ Run Schema Migration:', 'blue');
    log('   Copy and paste the contents of schema.sql', 'cyan');
    log('   Click "Run" to create all tables and indexes', 'cyan');
    
    log('\n4. 🔐 Run RLS Policies:', 'blue');
    log('   Copy and paste the contents of rls-policies.sql', 'cyan');
    log('   Click "Run" to set up security policies', 'cyan');
    
    log('\n5. ✅ Verify Setup:', 'blue');
    log('   Run this query to check tables:', 'cyan');
    log(`
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_type = 'BASE TABLE'
   ORDER BY table_name;`, 'magenta');
    
    log('\n📋 Expected Tables:', 'yellow');
    const expectedTables = [
      'admins',
      'classes', 
      'profiles',
      'schools',
      'students',
      'sub_admins',
      'subjects',
      'teachers'
    ];
    
    expectedTables.forEach(table => {
      log(`   ✓ ${table}`, 'green');
    });
    
    log('\n🎯 Database Structure:', 'yellow');
    log('======================', 'yellow');
    log('📁 profiles (base user data)', 'cyan');
    log('├── 👑 admins (admin-specific data)', 'cyan');
    log('├── 🔧 sub_admins (sub-admin data)', 'cyan');
    log('├── 👨‍🏫 teachers (teacher data)', 'cyan');
    log('└── 👨‍🎓 students (student data)', 'cyan');
    log('📁 schools (school information)', 'cyan');
    log('📁 classes (class/grade data)', 'cyan');
    log('📁 subjects (subject information)', 'cyan');
    
    log('\n🔐 Security Features:', 'yellow');
    log('===================', 'yellow');
    log('✅ Row Level Security (RLS) enabled', 'green');
    log('✅ Role-based access control', 'green');
    log('✅ School data isolation', 'green');
    log('✅ Temporary permissions for sub-admins', 'green');
    
    log('\n📝 Next Steps:', 'yellow');
    log('==============', 'yellow');
    log('1. Run the SQL migrations in Supabase', 'cyan');
    log('2. Test user creation in your app', 'cyan');
    log('3. Verify role-specific data is created', 'cyan');
    log('4. Test permissions and access control', 'cyan');
    
    log('\n🎉 Ready to migrate! Follow the instructions above.', 'green');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Show file contents for easy copying
function showFileContents() {
  log('\n📄 SQL File Contents (for easy copying):', 'bright');
  log('=========================================', 'bright');
  
  try {
    log('\n🗄️ SCHEMA.SQL:', 'yellow');
    log('==============', 'yellow');
    const schemaSQL = readSQLFile('schema.sql');
    log(schemaSQL, 'cyan');
    
    log('\n🔐 RLS-POLICIES.SQL:', 'yellow');
    log('===================', 'yellow');
    const rlsSQL = readSQLFile('rls-policies.sql');
    log(rlsSQL, 'cyan');
    
  } catch (error) {
    log(`❌ Error reading files: ${error.message}`, 'red');
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--show-sql')) {
    showFileContents();
  } else {
    runMigration();
  }
}

module.exports = { runMigration, showFileContents };

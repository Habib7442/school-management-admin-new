#!/usr/bin/env node

/**
 * Fee Management System Migration Script
 * 
 * This script helps set up the fee management database schema and RLS policies
 * Run with: node migrate-fee-management.js
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
  log('💰 Fee Management System Database Migration', 'cyan');
  log('==============================================', 'cyan');
  
  try {
    // Check if required files exist
    log('\n📋 Checking migration files...', 'yellow');
    
    const feeSchemaSQL = readSQLFile('fee-management-schema.sql');
    log('✅ fee-management-schema.sql found', 'green');
    
    log('\n📖 Migration Instructions:', 'bright');
    log('==========================', 'bright');
    
    log('\n⚠️  IMPORTANT: Prerequisites Check', 'red');
    log('==================================', 'red');
    log('Before running this migration, ensure:', 'yellow');
    log('1. ✅ Core schema (schema.sql) is already applied', 'cyan');
    log('2. ✅ RLS policies (rls-policies.sql) are already applied', 'cyan');
    log('3. ✅ Role management system is set up', 'cyan');
    log('4. ✅ Examination management is set up (if using)', 'cyan');
    
    log('\n🌐 Migration Steps:', 'blue');
    log('==================', 'blue');
    
    log('\n1. 🌐 Open your Supabase Dashboard:', 'blue');
    log('   https://supabase.com/dashboard', 'cyan');
    
    log('\n2. 📊 Navigate to SQL Editor:', 'blue');
    log('   Project → SQL Editor → New Query', 'cyan');
    
    log('\n3. 💰 Run Fee Management Schema:', 'blue');
    log('   Copy and paste the contents of fee-management-schema.sql', 'cyan');
    log('   Click "Run" to create all fee management tables', 'cyan');
    
    log('\n4. ✅ Verify Setup:', 'blue');
    log('   Run this query to check fee management tables:', 'cyan');
    log(`
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%fee%' OR table_name LIKE '%payment%' OR table_name LIKE '%invoice%'
   ORDER BY table_name;`, 'magenta');
    
    log('\n📋 Expected Fee Management Tables:', 'yellow');
    const expectedTables = [
      'fee_structures',
      'student_fee_assignments', 
      'installment_plans',
      'invoices',
      'invoice_line_items',
      'payments',
      'payment_allocations',
      'financial_transactions',
      'late_fees',
      'refunds',
      'payment_reminders',
      'fee_reports'
    ];
    
    expectedTables.forEach(table => {
      log(`   ✓ ${table}`, 'green');
    });
    
    log('\n🎯 Fee Management Features:', 'yellow');
    log('============================', 'yellow');
    log('💰 Fee Structure Management', 'cyan');
    log('├── Define fee types (tuition, admission, etc.)', 'cyan');
    log('├── Set amounts and due dates', 'cyan');
    log('├── Configure late fees and discounts', 'cyan');
    log('└── Support for installment plans', 'cyan');
    log('📄 Invoice & Payment Processing', 'cyan');
    log('├── Automated invoice generation', 'cyan');
    log('├── Multiple payment methods support', 'cyan');
    log('├── Payment allocation and tracking', 'cyan');
    log('└── Refund processing', 'cyan');
    log('📊 Financial Reporting & Analytics', 'cyan');
    log('├── Payment collection reports', 'cyan');
    log('├── Outstanding dues tracking', 'cyan');
    log('├── Financial transaction history', 'cyan');
    log('└── Automated payment reminders', 'cyan');
    
    log('\n🔐 Security Features:', 'yellow');
    log('===================', 'yellow');
    log('✅ Row Level Security (RLS) enabled on all tables', 'green');
    log('✅ School-based data isolation', 'green');
    log('✅ Role-based access control (Admin/Sub-Admin)', 'green');
    log('✅ Student access to own fee records', 'green');
    log('✅ Secure payment processing', 'green');
    
    log('\n🔧 Built-in Functions:', 'yellow');
    log('======================', 'yellow');
    log('📄 generate_invoice_number() - Auto invoice numbering', 'cyan');
    log('💳 generate_payment_number() - Auto payment numbering', 'cyan');
    log('⏰ calculate_late_fee() - Automatic late fee calculation', 'cyan');
    log('🔄 Auto-update triggers for totals and statuses', 'cyan');
    
    log('\n📝 Next Steps After Migration:', 'yellow');
    log('==============================', 'yellow');
    log('1. Test fee structure creation in admin panel', 'cyan');
    log('2. Assign fees to students', 'cyan');
    log('3. Generate and send invoices', 'cyan');
    log('4. Record payments and verify calculations', 'cyan');
    log('5. Test late fee calculations', 'cyan');
    log('6. Generate financial reports', 'cyan');
    
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
    log('\n💰 FEE-MANAGEMENT-SCHEMA.SQL:', 'yellow');
    log('=============================', 'yellow');
    const feeSchemaSQL = readSQLFile('fee-management-schema.sql');
    log(feeSchemaSQL, 'cyan');
    
  } catch (error) {
    log(`❌ Error reading files: ${error.message}`, 'red');
  }
}

// Validation function to check prerequisites
function validatePrerequisites() {
  log('\n🔍 Validating Prerequisites...', 'yellow');
  log('===============================', 'yellow');
  
  const requiredFiles = [
    'schema.sql',
    'rls-policies.sql',
    'fee-management-schema.sql'
  ];
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    try {
      readSQLFile(file);
      log(`✅ ${file} found`, 'green');
    } catch (error) {
      log(`❌ ${file} missing`, 'red');
      allFilesExist = false;
    }
  });
  
  if (!allFilesExist) {
    log('\n❌ Some required files are missing. Please ensure all prerequisite files exist.', 'red');
    process.exit(1);
  }
  
  log('\n✅ All prerequisite files found!', 'green');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--show-sql')) {
    showFileContents();
  } else if (args.includes('--validate')) {
    validatePrerequisites();
  } else {
    runMigration();
  }
}

module.exports = { runMigration, showFileContents, validatePrerequisites };

# Fee Management System Documentation

## Overview

The Fee Management System is a comprehensive solution for managing school fees, payments, and financial reporting. It provides a complete workflow from fee structure creation to payment processing and financial analytics.

## 🎯 Features

### Core Features
- **Fee Structure Management** - Define fee types, amounts, and payment schedules
- **Student Fee Assignment** - Assign fees to individual students or bulk assign to classes
- **Invoice Generation** - Automated invoice creation with customizable line items
- **Payment Processing** - Record and track payments with multiple payment methods
- **Financial Reporting** - Comprehensive reports and analytics
- **Late Fee Management** - Automatic late fee calculation and application
- **Installment Plans** - Support for payment installments
- **Refund Processing** - Handle fee refunds and adjustments

### Advanced Features
- **Real-time Dashboard** - Financial overview with key metrics
- **Payment Reminders** - Automated notifications for overdue payments
- **Multi-currency Support** - Handle different currencies
- **Discount Management** - Early payment discounts and fee waivers
- **Audit Trail** - Complete transaction history
- **Role-based Access** - Secure access control for different user roles

## 🏗️ Architecture

### Database Schema
The system uses 12 main tables:
- `fee_structures` - Fee type definitions
- `student_fee_assignments` - Fee assignments to students
- `installment_plans` - Payment installment schedules
- `invoices` - Invoice records
- `invoice_line_items` - Invoice details
- `payments` - Payment records
- `payment_allocations` - Payment distribution
- `financial_transactions` - Transaction audit trail
- `late_fees` - Late fee calculations
- `refunds` - Refund processing
- `payment_reminders` - Reminder notifications
- `fee_reports` - Generated reports

### API Endpoints
- `/api/fees/structures` - Fee structure CRUD operations
- `/api/fees/assignments` - Fee assignment management
- `/api/fees/assignments/bulk` - Bulk fee assignment
- `/api/fees/invoices` - Invoice management
- `/api/fees/payments` - Payment processing
- `/api/fees/reports` - Financial reporting
- `/api/fees/dashboard` - Dashboard analytics

### Security Features
- **Row Level Security (RLS)** - School-based data isolation
- **Role-based Access Control** - Admin/Sub-Admin permissions
- **Student Data Privacy** - Students can only access their own records
- **Secure Payment Processing** - Encrypted payment data
- **Audit Logging** - Complete transaction audit trail

## 🚀 Installation & Setup

### Prerequisites
1. Existing school management system with core schema
2. Supabase database with RLS enabled
3. Next.js application with authentication

### Database Migration
1. Run the fee management migration script:
   ```bash
   node database/migrate-fee-management.js
   ```

2. Apply the schema in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of database/fee-management-schema.sql
   ```

3. Verify installation:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%fee%' OR table_name LIKE '%payment%' OR table_name LIKE '%invoice%'
   ORDER BY table_name;
   ```

### UI Integration
The fee management UI is integrated into the admin panel at `/admin/fees` with the following tabs:
- Dashboard - Financial overview and metrics
- Fee Structures - Manage fee types and amounts
- Fee Assignments - Assign fees to students
- Invoices - Generate and manage invoices
- Payments - Record and track payments
- Reports - Financial reports and analytics
- System Test - Integration testing tool

## 📊 Usage Guide

### 1. Setting Up Fee Structures
1. Navigate to Admin → Fee Management → Fee Structures
2. Click "Create Fee Structure"
3. Fill in the required information:
   - Name (e.g., "Grade 1 Tuition Fee")
   - Fee Type (tuition, admission, examination, etc.)
   - Base Amount
   - Academic Year
   - Due Date
   - Payment Frequency
4. Configure optional settings:
   - Late fees
   - Installment plans
   - Early payment discounts
5. Save the fee structure

### 2. Assigning Fees to Students
#### Single Assignment
1. Go to Fee Assignments tab
2. Click "Assign to Student"
3. Select student and fee structure
4. Set due date and any discounts
5. Submit assignment

#### Bulk Assignment
1. Click "Bulk Assign"
2. Select fee structure
3. Choose students (individual or by class)
4. Set common parameters
5. Process bulk assignment

### 3. Recording Payments
1. Navigate to Payments tab
2. Click "Record Payment"
3. Enter payment details:
   - Student
   - Amount
   - Payment method
   - Reference number
4. Allocate payment to invoices/assignments
5. Save payment record

### 4. Generating Reports
1. Go to Reports tab
2. Select report type:
   - Collection Report
   - Outstanding Report
   - Refunds Report
   - Summary Report
3. Set date range and filters
4. Generate and download report

## 🔧 Configuration

### Fee Types
The system supports these fee types:
- `tuition` - Regular tuition fees
- `admission` - Admission/enrollment fees
- `examination` - Exam fees
- `library` - Library fees
- `laboratory` - Lab fees
- `transport` - Transportation fees
- `hostel` - Hostel/accommodation fees
- `sports` - Sports activity fees
- `activity` - Extra-curricular activities
- `development` - Development fees
- `security_deposit` - Security deposits
- `caution_money` - Caution money
- `miscellaneous` - Other fees

### Payment Methods
Supported payment methods:
- `cash` - Cash payments
- `cheque` - Cheque payments
- `bank_transfer` - Bank transfers
- `online` - Online payments
- `card` - Credit/debit card
- `upi` - UPI payments
- `wallet` - Digital wallet

### Permissions
Required permissions for fee management:
- `fees.read` - View fee structures and assignments
- `fees.create` - Create new fee structures
- `fees.update` - Modify existing fees
- `fees.delete` - Remove fee structures
- `payments.read` - View payment records
- `payments.create` - Record new payments
- `payments.verify` - Verify and approve payments
- `invoices.read` - View invoices
- `invoices.create` - Generate invoices
- `invoices.send` - Send invoices to students
- `refunds.read` - View refund requests
- `refunds.create` - Process refunds
- `refunds.approve` - Approve refund requests
- `financial_reports.read` - Access financial reports

## 🧪 Testing

### Integration Test
Use the built-in system test to verify installation:
1. Go to Admin → Fee Management → System Test
2. Click "Run Integration Tests"
3. Review test results:
   - Database Schema Check
   - Fee Structures API
   - Fee Assignments API
   - Payments API
   - Reports API
   - User Permissions

### Manual Testing Checklist
- [ ] Create fee structure
- [ ] Assign fee to student
- [ ] Generate invoice
- [ ] Record payment
- [ ] Check payment allocation
- [ ] Generate financial report
- [ ] Test late fee calculation
- [ ] Process refund
- [ ] Verify dashboard metrics

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify Supabase credentials
- Check RLS policies are applied
- Ensure user has proper permissions

#### API Errors
- Check authentication status
- Verify school_id parameter
- Review error logs in browser console

#### Permission Denied
- Confirm user role (admin/sub-admin required)
- Check RLS policies
- Verify user belongs to correct school

#### Missing Data
- Run database migration
- Check table creation
- Verify foreign key relationships

### Performance Optimization
- Enable caching for frequently accessed data
- Use pagination for large datasets
- Implement database indexing
- Monitor API response times

## 📈 Analytics & Reporting

### Dashboard Metrics
- Total collection amount
- Outstanding fees
- Monthly collection trends
- Payment method distribution
- Overdue assignments
- Collection rate percentage

### Available Reports
1. **Collection Report** - Payments received in a period
2. **Outstanding Report** - Unpaid fees and overdue amounts
3. **Refunds Report** - Refunds processed
4. **Summary Report** - Overall financial summary

### Export Options
- PDF reports
- Excel spreadsheets
- CSV data export
- Real-time dashboard

## 🔒 Security Considerations

### Data Protection
- All sensitive data is encrypted
- Payment information is securely stored
- Student data privacy is maintained
- Audit trails for all transactions

### Access Control
- Role-based permissions
- School-level data isolation
- Secure API endpoints
- Session management

### Compliance
- Financial data retention policies
- Audit trail requirements
- Data privacy regulations
- Security best practices

## 🚀 Future Enhancements

### Planned Features
- Payment gateway integration (Stripe, PayPal)
- SMS/Email notifications
- Mobile app support
- Advanced analytics
- Automated reconciliation
- Multi-language support

### API Improvements
- GraphQL support
- Webhook notifications
- Bulk operations
- Real-time updates
- Enhanced caching

## 📞 Support

For technical support or questions:
1. Check the troubleshooting section
2. Run the integration test
3. Review error logs
4. Contact system administrator

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial fee management system implementation
- Complete database schema
- Admin panel UI
- API endpoints
- Financial reporting
- Integration testing

---

**Note**: This fee management system is designed to integrate seamlessly with the existing school management system while providing comprehensive financial management capabilities.

# Product Requirements Document (PRD)  
## School Management System (SMS)  

### 1. Overview  
The School Management System (SMS) is a **SaaS platform** built to streamline school operations using a modern, scalable stack:  
- **Next.js** (Admin Panel)  
- **Supabase** (Auth + Database + Storage)  
- **Shadcn UI** (Admin panel components)  
- **React Native Expo** (Teacher & Student Apps)  
- **Upstash Redis** (Caching & Real-time sync)  

It includes **role-based permissions** with **custom & temporary access** for sub-admins, real-time updates, and mobile-first design.  

---

### 2. Goals  
- Centralize and digitize academic, administrative, and financial operations.  
- Offer **role-specific, secure** access to data.  
- Provide **real-time sync** between web and mobile clients.  
- Enable **multi-tenant SaaS** for serving multiple schools.  

---

### 3. Key Features  

#### 3.1 Core Modules  
- **Student Information System (SIS)**  
- **Admissions Management**  
- **Fee Management**  
- **Attendance Management**  
- **Timetable Management**  
- **Examination Management**  
- **Communication Tools**  
- **Human Resources & Payroll**  
- **Transport Management**  
- **Library Management**  
- **Inventory & Asset Management**  
- **Reporting & Analytics**  

#### 3.2 Admin Panel (Next.js + Shadcn + Supabase)  
- **Dashboard & Analytics**: Graphs, KPIs, alerts.  
- **User Management**: RBAC, sub-admin roles, temporary permissions.  
- **Admissions**: Custom forms, document uploads (Supabase storage).  
- **Academic**: Timetables, curriculum uploads, report card generation.  
- **Finance**: Invoices, fee tracking, payment gateway integration.  
- **HR & Payroll**: Staff profiles, leave tracking, salary processing.  
- **Transport**: Routes, driver details, GPS (future).  
- **Communication**: Announcements, in-app messages.  
- **Library & Inventory**: Catalogs, asset tracking.  
- **Reports**: CSV/Excel/PDF export.  
- **Settings**: School profile, backups, language settings.  

#### 3.3 Teacher App (React Native Expo + Supabase)  
- Dashboard with pending tasks & schedule.  
- Mark/view attendance.  
- Manage grades & assignments.  
- Lesson planning & syllabus tracking.  
- Access student profiles & behavioral notes.  
- Messaging & resource sharing.  

#### 3.4 Student App (React Native Expo + Supabase)  
- View grades, attendance, timetable.  
- Submit assignments & view results.  
- Track fee payments & due dates.  
- Access learning resources & events.  
- View transport details.  

---

### 4. User Roles & Permissions (RBAC with Supabase Policies)  

#### 4.1 Administrator  
- Full system control: all modules, reports, settings.  
- Manage users, permissions, curriculum, finances.  

#### 4.2 Sub-Admin  
- Access only assigned modules/features.  
- Temporary, time-bound permissions (e.g., 24h financial report access).  

#### 4.3 Teacher  
- Manage only assigned classes & subjects.  
- Grade entry, attendance marking, student communication.  

#### 4.4 Student  
- Read-only access to personal academic/fee data.  
- Assignment submission & communication.  

---

### 5. System Architecture  

**Frontend (Admin Panel)**:  
- Next.js 14 with App Router.  
- Shadcn UI for components.  
- Tailwind CSS for styling.  

**Frontend (Mobile Apps)**:  
- React Native Expo for iOS & Android.  
- Expo Router for navigation.  

**Backend / Database**:  
- Supabase (PostgreSQL + Storage + Auth).  
- Supabase Row Level Security (RLS) for RBAC.  

**Real-Time & Caching**:  
- Upstash Redis for:  
  - Real-time leaderboard-style updates (attendance, announcements).  
  - Caching frequently accessed queries.  

**Integration**:  
- Payment gateways (Stripe/PayPal).  
- Email/SMS via Supabase Functions or 3rd party APIs (Twilio, SendGrid).  

---

### 6. Data Flow & Real-Time Sync  
- **Centralized Supabase DB** for all entities (users, fees, grades, attendance).  
- **API Routes in Next.js** for secure business logic.  
- **Redis pub/sub** for instant updates to mobile & web clients.  
- **Webhooks** for payment confirmations & external integrations.  

---

### 7. Technical Requirements  
- **Hosting**: Vercel (Admin Panel), Supabase (Backend), Expo EAS (Mobile).  
- **Security**: JWT-based auth via Supabase, RLS, TLS encryption.  
- **Scalability**: Redis caching, Supabase connection pooling, lazy loading UI.  

---

### 8. Deployment & Maintenance  
- CI/CD:  
  - Vercel → auto-deploy on push for Admin Panel.  
  - Expo EAS → OTA updates for mobile apps.  
- Backups: Supabase daily backups, asset backup to cloud storage.  
- Monitoring: Vercel Analytics, Supabase logs, Redis metrics.  

---

### 9. Business Model  
- **Tiered SaaS Subscription** based on student count & features.  
- **One-time setup & training fees** for onboarding schools.  

---

### 10. Future Enhancements  
- AI-powered attendance from camera feeds.  
- Parent portal in mobile app.  
- IoT bus tracking.  
- Gamification for student engagement.  

---

### 11. Success Metrics  
- Reduction in manual paperwork.  
- Increased fee collection rate.  
- Higher attendance tracking accuracy.  
- Faster admission processing time.  

---

### 12. Risks & Mitigation  
- **Downtime** → Supabase replication, Vercel failover.  
- **Security Breach** → RLS + TLS + periodic penetration testing.  
- **Low adoption** → Onboarding support & in-app tutorials.  

---

### 13. Conclusion  
This SMS, powered by **Next.js, Supabase, Shadcn, React Native Expo, and Upstash Redis**, delivers a secure, scalable, and real-time school management experience for modern institutions.

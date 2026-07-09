# INTIZAR Academy LMS

**INTIZAR Academy LMS** wani web-based Learning Management System ne da aka gina domin sauƙaƙa gudanar da karatu, malamai, ɗalibai, assignments, attendance, grading, learning materials, group chat, notifications, da admin reports.

This project is built with **React + TypeScript + Supabase**.

---

## 📌 Project Overview

INTIZAR Academy LMS an tsara shi ne domin educational organization ko academy da ke buƙatar tsarin online learning mai sauƙi, tsari, da role-based access.

Tsarin yana da manyan roles guda uku:

- **Admin**
- **Instructor**
- **Student**

Kowane role yana da nasa dashboard da permissions.

---

## ✨ Main Features

### 👨‍💼 Admin Features

Admin zai iya:

- Manage users
- Add students, instructors, and admins
- Manage levels
- Manage courses
- Assign courses to levels
- Create groups
- Assign instructors to groups
- Add students into groups
- View admin reports
- Download reports as spreadsheet
- Print/save reports as PDF
- View group chat
- View notifications

---

### 👨‍🏫 Instructor Features

Instructor zai iya:

- View assigned groups
- See students inside assigned groups
- Schedule online lectures
- Publish recorded video lectures
- Upload learning materials
- Create assignments
- Upload assignment files
- View student submissions
- Download submitted files
- Grade student submissions
- Mark attendance
- Filter assignments by group
- Use group chat
- Receive notifications

---

### 👨‍🎓 Student Features

Student zai iya:

- View personal dashboard
- See assigned courses
- Download learning materials
- Download assignment files
- Submit assignment files
- View grades and feedback
- View attendance records
- Use group chat
- Receive notifications

---

## 🛠️ Tech Stack

This project uses:

- **React**
- **TypeScript**
- **Vite**
- **Supabase**
- **Supabase Auth**
- **Supabase Database**
- **Supabase Storage**
- **Row Level Security**
- **Lucide React Icons**

---

## 📁 Important Modules

```text
src/
├── components/
│   ├── common/
│   ├── layout/
│   └── learning/
├── pages/
│   ├── admin/
│   ├── instructor/
│   ├── student/
│   └── common/
├── lib/
│   ├── api.ts
│   ├── notify.ts
│   ├── theme.ts
│   └── types.ts
````

---

## 🔐 Roles and Access Control

The LMS uses role-based access:

```text
Admin       → Full system management
Instructor  → Assigned groups only
Student     → Own group/courses only
```

Supabase Row Level Security is used to protect database and storage access.

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Important:

```text
Do not push .env to GitHub.
```

---

## 🚀 How to Run Locally

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## 🧪 Testing Flow

Before real usage, test this complete workflow:

```text
1. Admin creates users.
2. Admin creates levels and courses.
3. Admin assigns courses to levels.
4. Admin creates groups.
5. Admin assigns instructor to group.
6. Admin adds students to group.
7. Instructor uploads learning materials.
8. Instructor creates assignment.
9. Student downloads assignment file.
10. Student submits file.
11. Instructor downloads submission.
12. Instructor grades submission.
13. Student sees grade and feedback.
14. Instructor marks attendance.
15. Student sees attendance.
16. Group chat works.
17. Notifications work.
18. Admin downloads reports.
```

---

## 📊 Reports

Admin reports include:

* User summary
* Group performance
* Course performance
* At-risk students
* Spreadsheet download
* Print / Save as PDF

---

## 🔔 Notifications

Notifications are used for:

* New assignment posted
* Student assignment submission
* Assignment graded
* Important learning activity

---

## 📦 Deployment

This frontend can be deployed on:

* Vercel
* Netlify
* Cloudflare Pages

For deployment, add these environment variables in the hosting dashboard:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## ⚠️ Production Notes

Before using with real students:

* Review all Supabase RLS policies
* Remove test data
* Create real users
* Confirm storage permissions
* Add official academy logo
* Add backup strategy
* Test with small group first

---

## 👤 Developer

Developed by:

**Muhammad Muttaka**
Cybersecurity Student, Astana IT University
GitHub: [mnasharifiya](https://github.com/mnasharifiya)

---

## 📄 License

This project is currently private/internal unless a license is added later.

---

## 🌱 Project Vision

Manufar wannan LMS ita ce samar da tsarin karatu na zamani ga INTIZAR Academy, inda admin, malamai, da ɗalibai za su iya aiki cikin tsari, tracking, accountability, da sauƙin amfani.

The long-term goal is to support structured digital learning, student monitoring, academic reporting, and organized online/offline education workflows.

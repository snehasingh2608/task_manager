# 🚀 Team Task Manager (Anti-Gravity Edition)

Welcome to the **Team Task Manager**! This is a high-performance, modern project and task management platform designed to help teams collaborate with zero friction. Whether you're an Admin looking for the big picture or a Tasker focused on the day's to-do list, this tool has you covered.

Built with a "premium-first" mindset, it features smooth animations, a glassmorphism-inspired UI, and a robust role-based access system.

---

## ✨ Key Features

### 🏢 For Administrators
*   **Global Command Center:** View system-wide stats including total tasks, projects, and users across the entire organization.
*   **Team Management:** A dedicated hub to oversee every member, verify roles, and track when they joined the team.
*   **Complete Oversight:** Manage all projects and keep the workforce moving efficiently.

### 👥 For Team Members
*   **Personal Dashboard:** Instantly see your active tasks, today's deadlines, and your project completion rate.
*   **Kanban Workflow:** A silky-smooth drag-and-drop board for moving tasks from "To Do" to "Done."
*   **Workforce Tracking:** Integrated punch-in/punch-out system to log your sessions and track your focus time.
*   **Project Hubs:** Deep dive into specific projects with clear priority indicators and assignee tracking.

---

## 🛠️ The Engine Under the Hood

We picked a stack that's fast, reliable, and easy to scale:

*   **Frontend:** [Next.js](https://nextjs.org/) (App Router), [React](https://reactjs.org/), and [Tailwind CSS](https://tailwindcss.com/) for that sleek look.
*   **Logic:** [Express.js](https://expressjs.com/) and [Node.js](https://nodejs.org/) handle the heavy lifting.
*   **Database:** [Prisma ORM](https://www.prisma.io/) with **SQLite** for instant local setup (can easily swap to PostgreSQL).
*   **State & Motion:** [Zustand](https://github.com/pmndrs/zustand) for clean state management and [Framer Motion](https://www.framer.com/motion/) for those buttery-smooth transitions.

---

## 🔑 Demo Accounts

Want to see it in action without signing up? Use these pre-seeded accounts (password for all is `password123`):

| Role | Email | Best For... |
| :--- | :--- | :--- |
| **Admin** | `admin@demo.com` | Testing Team Management and Global Stats |
| **Project Lead** | `lead@demo.com` | Managing specific projects and timelines |
| **Tasker** | `member@demo.com` | Checking out the personal dashboard and Kanban board |

---

## 🏃 Getting Started

Setting this up on your machine is a breeze.

### 1. The Backend (The Brains)
```bash
cd backend
npm install
# Push the schema and seed the demo data
npx prisma db push
npx ts-node prisma/seed.ts
# Launch the server
npm run dev
```
*Runs on: `http://localhost:5000`*

### 2. The Frontend (The Beauty)
```bash
cd frontend
npm install
# Launch the development server
npm run dev
```
*Runs on: `http://localhost:3000`*

---

## 🏗️ Architecture & Security
*   **Secure Auth:** All communication is protected via JWT (JSON Web Tokens).
*   **Permissions:** Role-based access ensures that sensitive team data is only visible to Admins.
*   **Data Integrity:** Validated using Zod on both ends to ensure no "garbage" data enters your system.

---

## 🚢 Deployment
The project is optimized for deployment on platforms like **Railway**. Just remember to:
1.  Set your `DATABASE_URL` (PostgreSQL recommended for production).
2.  Set `JWT_SECRET` to something very secure.
3.  Point your `NEXT_PUBLIC_API_URL` to your deployed backend.

---

*Made with ❤️ for high-performance teams.*

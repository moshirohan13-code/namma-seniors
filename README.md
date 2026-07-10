# Namma Seniors — Student Mentorship Platform (React + Vite)

A peer-to-peer mentorship platform connecting Karnataka students with seniors who have cracked KCET, COMEDK, JEE, and NEET.

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+ and npm
- Supabase project with tables & storage buckets set up (see SQL section below)

### **Installation**

```bash
# Clone the repo
git clone <your-repo-url>
cd namma-seniors

# Install dependencies
npm install

# Create .env from .env.example
cp .env.example .env

# Edit .env with your actual Supabase credentials and admin details
# CRITICAL: Never commit .env to Git!

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
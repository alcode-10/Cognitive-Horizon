# ✈️ Aviation Emergency Decision Support System

An AI-powered web platform that assists pilots and ATC in handling in-flight emergencies by providing real-time situational data, AI-guided emergency checklists, and safe diversion airport recommendations.

---

## 🚀 Features
- Real-time flight map with live telemetry (Socket.IO)
- AI-generated emergency response using **Cohere AI**
- Automated ATC call and pilot checklist
- Glide path visualization on the map
- Speech synthesis for cockpit simulation

---

## 🧠 Tech Stack
- **Frontend:** React, Leaflet.js, Socket.IO client
- **Backend:** Node.js, Express, Socket.IO
- **Database:** MongoDB
- **AI Engine:** Cohere API

---

## ⚙️ Setup
```bash
# Clone repository
git clone https://github.com/yourname/Cognitive-Horizon.git
cd Cognitive-Horizon

# Install dependencies
npm install

# Add environment variables
touch .env
# Add inside:
# API_KEY=your_key_here
# MONGO_DB_URI=your_mongo_connection

# Start backend
npm run server or nodemon index.js

# Start frontend (in another terminal)
npm run dev or npx vite

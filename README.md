# Realtime Group Chat Application

A real-time group chat application built using modern web technologies.  
The application enables users to join a shared chat room with a unique username, send and receive messages instantly, view online users, and see live typing indicators.

---

## Overview

This project demonstrates real-time communication using WebSockets. It focuses on clean architecture, predictable state handling, and efficient user management on both the client and server sides.

---

## Features

- Real-time messaging using WebSockets
- Live online user list
- Typing indicator support
- Unique username enforcement
- Username validation (blocks numeric-only and special characters)
- Message timestamps
- Clean and responsive user interface
- Lightweight and fast communication layer

---

## Technology Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Socket.IO Client

### Backend
- Node.js
- Express
- Socket.IO

---

## Project Structure

project-root/
├── backend/
│ ├── src/
│ │ └── index.js
│ └── package.json
│
├── frontend/
│ ├── src/
│ ├── index.html
│ └── package.json
│
└── README.md
---

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Backend Setup
- cd backend
- npm install
- npm start

### Frontend Setup
- cd frontend
- npm install
- npm run dev

# Hospital Management System – Frontend

React (Vite) app that talks to the Node.js backend.

## Setup

```bash
npm install
```

## Run

Start the **backend** first (from project root):

```bash
cd backend && npm start
```

Then start the frontend:

```bash
npm run dev
```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:3000  

The app uses `VITE_API_URL` from `.env` (default `http://localhost:3000`). Vite can also proxy `/api` to the backend (see `vite.config.js`); if `VITE_API_URL` is unset, relative `/api` requests are proxied.

## Demo login

- **Role:** Administrator  
- **Username:** root123  
- **Password:** root1234  

/* ============================================================
   FOCUSFLOW — Environment & API Configuration
   ============================================================ */

// Set this to your deployed backend URL (e.g. 'https://focusflow-backend.onrender.com')
// When set, the frontend on Firebase Hosting connects to your hosted backend.
const REMOTE_BACKEND_URL = '';

window.API = (() => {
  // Use local backend when developing on localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '';
  }
  // Allow overriding via localStorage for testing or custom host
  return localStorage.getItem('FOCUSFLOW_API_URL') || REMOTE_BACKEND_URL || '';
})();

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from '@/stores/authStore'

// Restore auth state from localStorage (token, user, isAuthenticated)
useAuthStore.getState().initialize()

// Restore private key from sessionStorage (on same-tab refresh).
// If sessionStorage empty (new tab/browser), UnlockKeyPrompt will ask for password.
useAuthStore.getState().fetchCurrentUser()

createRoot(document.getElementById('root')!).render(
  <App />
)

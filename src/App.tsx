import './App.css';

import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Toaster } from "sonner"

import HomePage from '@/Pages/HomePage';
import NotFoundPage from '@/Pages/NotFoundPage';
import LoginPage from '@/Pages/LoginPage';
import ChatPage from '@/Pages/ChatPage';
import JoinPage from '@/Pages/JoinPage';
import { AuthGuard } from '@/Pages/guards/AuthGuard';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/join/:invitationId" element={<JoinPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;

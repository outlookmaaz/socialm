import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PerformanceMonitor } from "@/components/ui/performance-monitor";
import { useTheme } from "@/hooks/use-theme";
import { usePushNotifications } from "@/hooks/use-push-notifications";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Friends from "./pages/Friends";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Components
import { AuthGuard } from "./components/common/AuthGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { requestPermission } = usePushNotifications();
  
  useEffect(() => {
    // Apply theme immediately on mount
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'win95');
    root.classList.add(theme);

    // Apply color theme
    root.classList.remove('theme-green', 'theme-blue', 'theme-red', 'theme-orange', 'theme-purple');
    if (colorTheme !== 'green') {
      root.classList.add(`theme-${colorTheme}`);
    }

    // Set favicon and title
    const faviconLink = document.querySelector("link[rel*='icon']") || document.createElement('link');
    faviconLink.setAttribute('rel', 'shortcut icon');
    faviconLink.setAttribute('href', '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png');
    document.head.appendChild(faviconLink);
    
    document.title = "SocialChat - Real-time Social Messaging Platform";
  }, [theme, colorTheme, setTheme, setColorTheme]);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setLoading(false);
          localStorage.clear();
          sessionStorage.clear();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setLoading(false);
          
          // Request push notification permission after login
          if (session && 'Notification' in window) {
            setTimeout(() => {
              if (Notification.permission === 'default') {
                requestPermission();
              }
            }, 2000);
          }
        } else if (event === 'INITIAL_SESSION') {
          setSession(session);
          setLoading(false);
        } else {
          setSession(session);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      // Add a small delay to show the loading animation
      setTimeout(() => setLoading(false), 1000);
    });

    // Request notification permission on app load
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    }

    // Performance optimization: Preload critical routes
    if (session) {
      import('./pages/Dashboard');
      import('./pages/Messages');
      import('./pages/Friends');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [requestPermission]);

  // Add error boundary for better error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      // You could send this to an error reporting service
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // You could send this to an error reporting service
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PerformanceMonitor />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={session ? <Navigate to="/dashboard" replace /> : <Index />} 
            />
            <Route 
              path="/login" 
              element={session ? <Navigate to="/dashboard" replace /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={session ? <Navigate to="/dashboard" replace /> : <Register />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              } 
            />
            <Route 
              path="/friends" 
              element={
                <AuthGuard>
                  <Friends />
                </AuthGuard>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <AuthGuard>
                  <Messages />
                </AuthGuard>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <AuthGuard>
                  <Notifications />
                </AuthGuard>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <AuthGuard>
                  <Settings />
                </AuthGuard>
              } 
            />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface GoogleAuthButtonProps {
  mode: 'signin' | 'signup';
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

export function GoogleAuthButton({ mode, disabled }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        initializeGoogleAuth();
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const generateNonce = async (): Promise<[string, string]> => {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const encoder = new TextEncoder();
    const encodedNonce = encoder.encode(nonce);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return [nonce, hashedNonce];
  };

  const initializeGoogleAuth = async () => {
    if (!window.google) return;

    try {
      const [nonce, hashedNonce] = await generateNonce();

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id',
        callback: handleGoogleResponse,
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
      });
    } catch (error) {
      console.error('Error initializing Google Auth:', error);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    try {
      setIsLoading(true);
      
      const [nonce] = await generateNonce();
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        nonce,
      });

      if (error) throw error;

      toast({
        title: `${mode === 'signin' ? 'Welcome back!' : 'Welcome to SocialChat!'}`,
        description: 'You have been successfully authenticated with Google.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        variant: 'destructive',
        title: 'Authentication failed',
        description: error.message || 'Failed to authenticate with Google. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (!window.google) {
      toast({
        variant: 'destructive',
        title: 'Google Auth not loaded',
        description: 'Please refresh the page and try again.',
      });
      return;
    }

    try {
      window.google.accounts.id.prompt();
    } catch (error) {
      console.error('Error showing Google prompt:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to show Google sign-in. Please try again.',
      });
    }
  };

  return (
    <Button
      onClick={handleGoogleClick}
      disabled={disabled || isLoading}
      variant="outline"
      className="w-full font-pixelated text-sm h-10 border-2 hover:bg-gray-50 transition-colors"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          {mode === 'signin' ? 'Signing in...' : 'Signing up...'}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </div>
      )}
    </Button>
  );
}
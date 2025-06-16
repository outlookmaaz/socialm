import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | 'invalid' | 'idle'>('idle');
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'taken' | 'invalid' | 'idle'>('idle');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Real-time username validation with improved UX
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    // Check username format first
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .single();

        if (error && error.code === 'PGRST116') {
          // No rows returned - username is available
          setUsernameStatus('available');
        } else if (data) {
          // Username exists
          setUsernameStatus('taken');
        }
      } catch (error) {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  // Real-time email validation with improved checking
  useEffect(() => {
    if (!email || !email.includes('@') || email.length < 5) {
      setEmailStatus('idle');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('invalid');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setEmailStatus('checking');
      try {
        // Check if email exists in auth.users
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: 'dummy_password_for_check'
        });

        if (error?.message?.includes('Invalid login credentials')) {
          // Email not found - available
          setEmailStatus('available');
        } else if (error?.message?.includes('Email not confirmed')) {
          // Email exists but not confirmed
          setEmailStatus('taken');
        } else {
          // Other error or success means email exists
          setEmailStatus('taken');
        }
      } catch (error) {
        setEmailStatus('idle');
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Final validation
      if (!email || !password || !name || !username) {
        throw new Error('Please fill in all fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (usernameStatus === 'taken') {
        throw new Error('Username is already taken');
      }

      if (usernameStatus === 'invalid') {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      if (emailStatus === 'taken') {
        throw new Error('An account with this email already exists');
      }

      if (emailStatus === 'invalid') {
        throw new Error('Please enter a valid email address');
      }

      if (!acceptedTerms) {
        throw new Error('Please accept the terms and conditions');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            username: username.toLowerCase().trim(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setRegistrationSuccess(true);
        toast({
          title: 'Registration successful!',
          description: 'Please check your email to confirm your account before logging in.',
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
      });
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="w-full max-w-md mx-auto px-4">
        <Card className="w-full">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl sm:text-2xl font-pixelated social-gradient bg-clip-text text-transparent">
              Check Your Email
            </CardTitle>
            <CardDescription className="font-pixelated text-xs sm:text-sm">
              We've sent you a confirmation email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="text-center space-y-3">
              <p className="font-pixelated text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Please check your email inbox (and spam folder) for a confirmation link.
              </p>
              <p className="font-pixelated text-xs sm:text-sm text-muted-foreground leading-relaxed">
                After confirming your email, you can log in to your account.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full font-pixelated text-xs sm:text-sm h-10 sm:h-11"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Card className="w-full">
        <CardHeader className="text-center space-y-2 p-4 sm:p-6">
          <div className="bg-yellow-100 text-yellow-800 p-2 sm:p-3 rounded-md mb-2 sm:mb-4">
            <p className="font-pixelated text-xs leading-relaxed">
              🚧 This project is under development. Some features may be limited or unavailable.
            </p>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-pixelated social-gradient bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="font-pixelated text-xs sm:text-sm">
            Join our social community
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-pixelated text-xs sm:text-sm">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="font-pixelated text-xs sm:text-sm h-10 sm:h-11"
              />
            </div>
            
            {/* Username with real-time validation */}
            <div className="space-y-2">
              <Label htmlFor="username" className="font-pixelated text-xs sm:text-sm">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                  className={`font-pixelated text-xs sm:text-sm h-10 sm:h-11 pr-10 ${
                    usernameStatus === 'invalid' || usernameStatus === 'taken' 
                      ? 'border-red-500 focus:ring-red-500' 
                      : usernameStatus === 'available'
                      ? 'border-green-500 focus:ring-green-500'
                      : ''
                  }`}
                />
                {username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {usernameStatus === 'available' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {username.length >= 3 && (
                <p className={`font-pixelated text-xs ${
                  usernameStatus === 'available' ? 'text-green-600' :
                  usernameStatus === 'taken' ? 'text-red-600' :
                  usernameStatus === 'invalid' ? 'text-red-600' :
                  usernameStatus === 'checking' ? 'text-blue-600' :
                  'text-gray-500'
                }`}>
                  {usernameStatus === 'checking' && 'Checking availability...'}
                  {usernameStatus === 'available' && '✓ Username is available'}
                  {usernameStatus === 'taken' && '✗ Username is already taken'}
                  {usernameStatus === 'invalid' && '✗ Username can only contain letters, numbers, and underscores'}
                </p>
              )}
            </div>

            {/* Email with real-time validation */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-pixelated text-xs sm:text-sm">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`font-pixelated text-xs sm:text-sm h-10 sm:h-11 pr-10 ${
                    emailStatus === 'taken' || emailStatus === 'invalid'
                      ? 'border-red-500 focus:ring-red-500' 
                      : emailStatus === 'available'
                      ? 'border-green-500 focus:ring-green-500'
                      : ''
                  }`}
                />
                {email.includes('@') && email.length >= 5 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailStatus === 'checking' && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {emailStatus === 'available' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {(emailStatus === 'taken' || emailStatus === 'invalid') && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {email.includes('@') && email.length >= 5 && (
                <p className={`font-pixelated text-xs ${
                  emailStatus === 'available' ? 'text-green-600' :
                  emailStatus === 'taken' ? 'text-red-600' :
                  emailStatus === 'invalid' ? 'text-red-600' :
                  emailStatus === 'checking' ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {emailStatus === 'checking' && 'Checking availability...'}
                  {emailStatus === 'available' && '✓ Email is available'}
                  {emailStatus === 'taken' && '✗ Email is already registered'}
                  {emailStatus === 'invalid' && '✗ Please enter a valid email address'}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="font-pixelated text-xs sm:text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="font-pixelated text-xs sm:text-sm h-10 sm:h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {password.length > 0 && (
                <p className={`font-pixelated text-xs ${
                  password.length >= 6 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {password.length >= 6 ? '✓' : '✗'} Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox 
                id="terms" 
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="data-[state=checked]:bg-social-green data-[state=checked]:border-social-green mt-1"
              />
              <label
                htmlFor="terms"
                className="text-xs sm:text-sm font-pixelated leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I accept the{' '}
                <a 
                  href="https://socialchatprivacypolicy.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-social-green hover:underline"
                >
                  terms and conditions
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs sm:text-sm h-10 sm:h-11 transition-colors hover-scale" 
              disabled={loading || usernameStatus === 'taken' || emailStatus === 'taken' || usernameStatus === 'checking' || emailStatus === 'checking' || usernameStatus === 'invalid' || emailStatus === 'invalid' || !acceptedTerms}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-pixelated text-xs sm:text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-social-green hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
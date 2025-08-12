
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Github, Chrome, Loader2 } from "lucide-react";
import { signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail } from '@/lib/firebase-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  onSuccess?: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAuthSuccess = () => {
    toast({
        title: "Success!",
        description: "You've been successfully logged in.",
    });
    onSuccess?.();
    router.refresh(); // Refresh server components to reflect login state
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmail(loginEmail, loginPassword);
      handleAuthSuccess();
    } catch (err: any) {
      setError(err.code === 'auth/invalid-credential' ? 'Invalid email or password.' : err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signUpWithEmail(signupEmail, signupPassword);
      handleAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setError(null);
    try {
      const signInMethod = provider === 'google' ? signInWithGoogle : signInWithGitHub;
      await signInMethod();
      handleAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <div className="py-4 px-1 space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
                    <Chrome className="mr-2 h-4 w-4" /> Google
                </Button>
                <Button variant="outline" onClick={() => handleSocialLogin('github')} disabled={isLoading}>
                    <Github className="mr-2 h-4 w-4" /> GitHub
                </Button>
            </div>
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
            </div>
            <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="space-y-1">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="m@example.com" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} disabled={isLoading}/>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
                </Button>
            </form>
        </div>
      </TabsContent>
      <TabsContent value="signup">
        <div className="py-4 px-1 space-y-4">
             <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
                    <Chrome className="mr-2 h-4 w-4" /> Google
                </Button>
                <Button variant="outline" onClick={() => handleSocialLogin('github')} disabled={isLoading}>
                    <Github className="mr-2 h-4 w-4" /> GitHub
                </Button>
            </div>
            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
            </div>
            <form onSubmit={handleEmailSignup} className="space-y-3">
                <div className="space-y-1">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="m@example.com" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} disabled={isLoading}/>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                </Button>
            </form>
        </div>
      </TabsContent>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Tabs>
  );
}

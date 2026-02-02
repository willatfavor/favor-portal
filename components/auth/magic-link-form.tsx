'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }

      setIsSent(true);
      toast.success('Magic link sent! Check your email.');
    } catch (error) {
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <Card className="w-full max-w-md border-[#c5ccc2]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2b4d24]/10">
            <Mail className="h-6 w-6 text-[#2b4d24]" />
          </div>
          <CardTitle className="font-['Cormorant_Garamond'] text-2xl font-normal text-[#1a1a1a]">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-[#666666]">
            We sent a magic link to <strong>{email}</strong>. Click the link in the email to access your portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full border-[#2b4d24] text-[#2b4d24] hover:bg-[#2b4d24] hover:text-white"
            onClick={() => setIsSent(false)}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-[#c5ccc2]">
      <CardHeader className="text-center">
        <CardTitle className="font-['Cormorant_Garamond'] text-3xl font-normal text-[#1a1a1a]">
          Partner Portal
        </CardTitle>
        <CardDescription className="text-[#666666]">
          Enter your email to receive a secure login link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#333333]">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-[#c5ccc2] focus:border-[#2b4d24] focus:ring-[#2b4d24]"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-[#2b4d24] hover:bg-[#1a3d14] text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[#999999]">
          No password needed. We'll email you a secure link.
        </p>
      </CardContent>
    </Card>
  );
}

'use client';

import { MagicLinkForm } from '@/components/auth/magic-link-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFEF9] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img 
            src="https://storage.googleapis.com/msgsndr/LblL0AiRWSIvV6fFQuRT/media/67bf4d8383ae0d6d7dc507fe.png" 
            alt="Favor International" 
            className="mx-auto mb-4 h-16"
          />
          <p className="text-[#666666] font-light">
            Partner Portal Access
          </p>
        </div>
        <MagicLinkForm />
      </div>
    </div>
  );
}

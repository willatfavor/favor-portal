'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MagicLinkForm } from '@/components/auth/magic-link-form';
import { APP_CONFIG } from '@/lib/constants';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="https://storage.googleapis.com/msgsndr/LblL0AiRWSIvV6fFQuRT/media/67bf4d8383ae0d6d7dc507fe.png"
            alt="Favor International"
            width={240}
            height={64}
            className="mx-auto mb-4 h-16 w-auto"
            unoptimized
            priority
          />
          <p className="text-[#666666] font-light">
            Partner Portal Access
          </p>
        </div>
        <MagicLinkForm />
        <p className="mt-4 text-center text-xs text-[#666666]">
          Staff/admin? <Link href="/admin/login" className="text-[#2b4d24] underline">Use admin sign-in</Link>
        </p>
      </div>
    </div>
  );
}

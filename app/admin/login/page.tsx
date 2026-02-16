import Image from "next/image";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { APP_CONFIG } from "@/lib/constants";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src={APP_CONFIG.logo}
            alt="Favor International"
            width={240}
            height={64}
            className="mx-auto mb-4 h-16 w-auto"
            priority
          />
          <p className="text-[#666666] font-light">Admin Console Access</p>
        </div>

        <MagicLinkForm
          scope="admin"
          redirectTo="/admin"
          title="Admin Console"
          description="Enter your staff email to receive an admin login link"
          sentTitle="Check Your Email"
          sentDescription="If your account has admin access, a secure admin link has been sent."
        />
      </div>
    </div>
  );
}

import { AuthProvider } from "@/hooks/use-auth";
import { PortalShell } from "@/components/portal/portal-shell";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PortalShell>{children}</PortalShell>
    </AuthProvider>
  );
}

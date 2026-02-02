import { redirect } from 'next/navigation';

export default function PortalRootPage() {
  // Redirect to dashboard when accessing / directly
  redirect('/dashboard');
}

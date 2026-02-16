import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main id="main-content">{children}</main>;
}

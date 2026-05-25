'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// OTP-based reset is handled entirely on /forgot-password now
export default function ResetPasswordPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/forgot-password'); }, [router]);
  return null;
}

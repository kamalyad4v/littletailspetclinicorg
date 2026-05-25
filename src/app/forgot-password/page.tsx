'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Mail, HeartPulse, ArrowLeft, CheckCircle2, Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'success';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Step 1: Send OTP ──────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('OTP sent to your email!');
      setStep('otp');
      startResendCooldown();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend cooldown timer ─────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('New OTP sent!');
      setOtp(['', '', '', '', '', '']);
      startResendCooldown();
      otpRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── Step 2: Verify OTP + reset password ──────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) { toast.error('Please enter the 6-digit OTP'); return; }
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50/40 to-white relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

      <div
        className="relative w-full max-w-md mx-4"
        style={{ animation: 'fadeUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/8 border border-blue-100 p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <Image src="/logo.png" alt="Little Tails" width={44} height={44} className="rounded-xl" />
              <div>
                <span className="text-2xl font-bold text-[#1A2332] font-[Fredoka]">
                  Little<span className="text-[#1565C0]">Tails</span>
                </span>
                <div className="flex items-center gap-1">
                  <HeartPulse size={10} className="text-[#E53935]" />
                  <span className="text-[9px] text-[#5F6B7A] font-medium">Pet Clinic</span>
                </div>
              </div>
            </Link>
          </div>

          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Mail size={26} className="text-[#1565C0]" />
                </div>
                <h1 className="text-xl font-bold text-[#1A2332]">Forgot Password?</h1>
                <p className="text-sm text-[#5F6B7A] mt-1">
                  Enter your email and we&apos;ll send you a 6-digit OTP
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={16} />}
                  required
                />
                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Send OTP
                </Button>
              </form>
            </>
          )}

          {/* ── Step 2: OTP + New Password ── */}
          {step === 'otp' && (
            <div style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <ShieldCheck size={26} className="text-[#1565C0]" />
                </div>
                <h1 className="text-xl font-bold text-[#1A2332]">Enter OTP</h1>
                <p className="text-sm text-[#5F6B7A] mt-1">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* OTP boxes */}
                <div>
                  <label className="block text-sm font-medium text-[#1A2332] mb-3 text-center">
                    Enter the 6-digit OTP
                  </label>
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-11 h-13 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-200"
                        style={{
                          height: '52px',
                          borderColor: digit ? '#1565C0' : '#DDE3EC',
                          background: digit ? '#EBF5FB' : '#F5F7FA',
                          color: '#1A2332',
                          caretColor: '#1565C0',
                        }}
                      />
                    ))}
                  </div>

                  {/* Resend */}
                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || loading}
                      className="inline-flex items-center gap-1 text-sm text-[#1565C0] disabled:opacity-40 hover:underline"
                    >
                      <RefreshCw size={12} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock size={16} />}
                  required
                />

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Reset Password
                </Button>
              </form>

              <button
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); }}
                className="mt-4 w-full text-center text-sm text-[#5F6B7A] hover:text-[#1565C0] transition-colors"
              >
                ← Use a different email
              </button>
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 'success' && (
            <div
              className="text-center space-y-4"
              style={{ animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1A2332]">Password Reset!</h2>
                <p className="text-sm text-[#5F6B7A] mt-2">
                  Your password has been updated successfully. You can now log in with your new password.
                </p>
              </div>
              <Link href="/login">
                <Button className="w-full mt-2" size="lg">Go to Login</Button>
              </Link>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-[#5F6B7A] hover:text-[#1565C0] transition-colors"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

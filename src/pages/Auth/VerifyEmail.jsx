import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const VerifyEmailPage = () => {
  const { verifyEmailOtp, resendOtp, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email from navigation state, sessionStorage, or fallback
  const [email, setEmail] = useState(() => {
    return (
      location.state?.email ||
      sessionStorage.getItem('puko_verify_email') ||
      'alpukatkocokpuko@gmail.com'
    );
  });

  // 6 individual digit inputs for high quality OTP entry
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === 'ADMIN' ? '/dashboard' : '/kasir';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto focus first empty input box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Handle digit change
  const handleDigitChange = (index, value) => {
    // Only accept numbers
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      // Clear current digit
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // If user typed or pasted multiple characters (e.g. "123456")
    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split('');
      const nextDigits = [...digits];
      chars.forEach((c, idx) => {
        if (index + idx < 6) {
          nextDigits[index + idx] = c;
        }
      });
      setDigits(nextDigits);

      // Focus on the next empty box or the last box
      const nextFocus = Math.min(index + chars.length, 5);
      if (inputRefs.current[nextFocus]) {
        inputRefs.current[nextFocus].focus();
      }
      return;
    }

    // Single digit input
    const nextDigits = [...digits];
    nextDigits[index] = cleanVal;
    setDigits(nextDigits);

    // Auto advance to next box
    if (index < 5 && cleanVal) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key down (Backspace navigation)
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste full OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const chars = pasteData.split('');
    const nextDigits = ['', '', '', '', '', ''];
    chars.forEach((c, idx) => {
      if (idx < 6) nextDigits[idx] = c;
    });
    setDigits(nextDigits);

    const nextFocus = Math.min(chars.length, 5);
    inputRefs.current[nextFocus]?.focus();
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');

    const token = digits.join('').trim();

    // 1. Validasi bahwa kode harus 6 digit
    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setError('Kode OTP harus terdiri dari 6 digit angka.');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Gunakan supabase.auth.verifyOtp() melalui AuthContext
      const result = await verifyEmailOtp(email, token);

      if (result.success) {
        playSuccessSound();
        setSuccessMessage('Verifikasi berhasil! Email Anda telah terkonfirmasi.');
        
        // 3. Arahkan user ke dashboard kasir
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 900);
      }
    } catch (err) {
      // 4. Tampilkan pesan error jika kode salah atau expired
      const msg = err.message || '';
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('Kode OTP salah atau kadaluarsa. Jika sebelumnya Anda sudah pernah klik tautan konfirmasi, akun Anda sebenarnya sudah aktif! Silakan klik "Masuk Langsung".');
      } else {
        setError(msg || 'Kode OTP salah atau sudah kadaluarsa. Periksa kembali Gmail Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Code
  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await resendOtp(email);
      setResendCooldown(60);
      setSuccessMessage(`Kode OTP 6 digit baru telah dikirimkan ke ${email}.`);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang kode. Silakan coba sesaat lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const isOtpComplete = digits.every((d) => d !== '');

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-slate-100 to-slate-200 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden selection:bg-puko-500 selection:text-white">
      {/* Decorative background glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-puko-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-block relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden bg-white p-1 shadow-xl border border-slate-200/90 ring-4 ring-puko-500/15">
              <img
                src="/logo.png"
                alt="PUKO Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900">
              PUKO POS
            </h1>
            <p className="text-xs font-bold text-slate-500 tracking-wide mt-0.5">
              Alpukat Kocok No Serat No Pahit
            </p>
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/5 space-y-5">
          {/* Card Title */}
          <div className="text-center space-y-1">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-puko-100 text-puko-700 flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight pt-1">
              Verifikasi Kode OTP
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Masukkan 6 digit kode OTP yang telah dikirimkan ke email akun Gmail Anda:
            </p>
          </div>

          {/* Email Target Box */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                Kode Dikirim Ke:
              </span>
              <span className="font-extrabold text-xs text-emerald-950 truncate block font-sans">
                {email}
              </span>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          {/* 6-Digit OTP Inputs Form */}
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 text-center">
                Masukkan 6 Digit Angka
              </label>

              {/* 6 Square Input Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all font-mono outline-none shadow-xs ${
                      digit
                        ? 'border-puko-600 bg-puko-50/50 text-slate-900 ring-2 ring-puko-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-puko-500 focus:bg-white focus:ring-4 focus:ring-puko-500/15'
                    }`}
                  />
                ))}
              </div>

              <p className="text-[11px] text-slate-400 text-center mt-2.5 leading-relaxed">
                Periksa kotak masuk atau folder spam di akun Gmail Anda
              </p>
            </div>

            {/* Tombol Verifikasi */}
            <button
              type="submit"
              disabled={isLoading || !isOtpComplete}
              className={`w-full py-3 px-4 rounded-xl text-white font-extrabold text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isOtpComplete && !isLoading
                  ? 'bg-puko-600 hover:bg-puko-700 shadow-puko-900/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Kode OTP...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verifikasi & Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Helper note for users whose accounts might already be active */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <div className="flex-1">
              <span className="font-bold block">Tidak ada email / kode yang masuk?</span>
              1. Cek folder <b>Spam</b> atau <b>Promosi</b> di Gmail Anda.<br/>
              2. Jika Anda sebelumnya sudah pernah klik link konfirmasi, akun Anda sudah aktif!{' '}
              <button
                type="button"
                onClick={() => navigate('/login', { state: { email } })}
                className="text-puko-800 font-extrabold underline hover:text-puko-900 cursor-pointer"
              >
                Klik di sini untuk langsung Masuk
              </button>
            </div>
          </div>

          {/* Tombol Kirim Ulang Kode & Navigasi */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              className={`font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                resendCooldown > 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-puko-700 hover:text-puko-800 hover:underline'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>
                {resendCooldown > 0
                  ? `Kirim ulang kode (${resendCooldown}s)`
                  : 'Kirim Ulang Kode OTP'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Masuk</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          PUKO Alpukat Kocok &copy; {new Date().getFullYear()} &bull; Sistem Kasir POS
        </p>
      </div>
    </div>
  );
};

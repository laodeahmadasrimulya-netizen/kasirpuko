import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Sparkles,
  Phone,
  CheckCircle2,
  X,
  KeyRound,
  ShieldCheck,
  MessageSquare,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const LoginPage = () => {
  const {
    user,
    isAuthenticated,
    login,
    signUpWithEmail,
    findUserByPhone,
    resetPasswordWithPhone,
    normalizePhone,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect automatically
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === 'ADMIN' ? '/dashboard' : '/kasir';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Sync email passed from VerifyEmail or registration
  useEffect(() => {
    if (location.state?.email) {
      setLoginIdentifier(location.state.email);
    }
  }, [location.state]);

  // Mode: 'LOGIN' | 'REGISTER'
  const [mode, setMode] = useState('LOGIN');

  // Form states - Login
  const [loginIdentifier, setLoginIdentifier] = useState(
    location.state?.email || sessionStorage.getItem('puko_verify_email') || ''
  );
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // UI status
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal: 3-Step OTP flow ('PHONE' | 'OTP' | 'NEW_PASSWORD')
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('PHONE');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCopied, setOtpCopied] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const otpInputRefs = useRef([]);

  // Countdown timer for OTP Resend
  useEffect(() => {
    let timer;
    if (isForgotModalOpen && forgotStep === 'OTP' && otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isForgotModalOpen, forgotStep, otpCountdown]);

  // Auto-focus first input when moving to OTP step
  useEffect(() => {
    if (isForgotModalOpen && forgotStep === 'OTP') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isForgotModalOpen, forgotStep]);

  // Close & reset forgot password modal
  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotStep('PHONE');
    setRecoveryPhone('');
    setVerifiedUser(null);
    setOtpDigits(['', '', '', '', '', '']);
    setGeneratedOtp('');
    setOtpExpiry(null);
    setOtpCountdown(0);
    setRecoveryError('');
    setNewPassword('');
    setConfirmPassword('');
    setShowForgotNewPassword(false);
    setShowForgotConfirmPassword(false);
  };

  // Switch mode helper
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

  // 1. Submit LOGIN
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const result = await login(loginIdentifier, loginPassword);

      if (result.success) {
        playSuccessSound();
        const redirectPath = result.user.role === 'ADMIN' ? '/dashboard' : '/kasir';
        navigate(redirectPath, { replace: true });
      } else {
        if (result.code === 'EMAIL_NOT_CONFIRMED') {
          // Redirect immediately to /verify-email
          navigate('/verify-email', {
            state: { email: result.email || loginIdentifier },
          });
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat masuk. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit REGISTER
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpWithEmail(regName, regEmail, regPassword);

      if (result.needsConfirmation) {
        // Redirect directly to /verify-email page with email state
        navigate('/verify-email', {
          state: { email: result.email },
        });
      } else {
        // Direct login if confirmation was disabled in Supabase
        playSuccessSound();
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal. Pastikan email Anda valid.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. STEP 1: Request OTP via WhatsApp / Phone
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setRecoveryError('');
    setIsSendingOtp(true);

    try {
      const cleanPhone = normalizePhone(recoveryPhone);
      if (!cleanPhone) {
        setRecoveryError('Masukkan nomor WhatsApp / telepon yang valid.');
        setIsSendingOtp(false);
        return;
      }

      const target = findUserByPhone(cleanPhone);
      if (!target) {
        setRecoveryError(
          'Nomor WhatsApp ini tidak terdaftar pada akun mana pun. Pastikan nomor sesuai dengan yang terdaftar.'
        );
        setIsSendingOtp(false);
        return;
      }

      // Generate random 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpExpiry(Date.now() + 5 * 60 * 1000); // Valid for 5 minutes
      setOtpCountdown(60); // 60 seconds cooldown for resend
      setVerifiedUser(target);
      setOtpDigits(['', '', '', '', '', '']);

      // Optional: Send automated WhatsApp message via Fonnte Gateway if token is set
      const fonnteToken = import.meta.env?.VITE_FONNTE_TOKEN;
      if (fonnteToken) {
        try {
          fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
              Authorization: fonnteToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              target: cleanPhone,
              message: `[PUKO POS] Kode OTP pemulihan kata sandi akun *${target.name}* adalah: *${code}*.\n\nKode berlaku selama 5 menit. JANGAN berikan kode ini kepada siapa pun demi keamanan akun kasir Anda.`,
            }),
          }).catch((err) => console.warn('Fonnte send error:', err));
        } catch (err) {
          console.warn('Fonnte send error:', err);
        }
      }

      playSuccessSound();
      setForgotStep('OTP');
    } catch (err) {
      setRecoveryError(err.message || 'Gagal mengirim kode OTP. Coba lagi.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 4. STEP 2: Resend OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isSendingOtp) return;
    await handleRequestOtp();
  };

  // 5. STEP 2: Digit change handler
  const handleOtpDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split('');
      const next = [...otpDigits];
      chars.forEach((c, idx) => {
        if (index + idx < 6) {
          next[index + idx] = c;
        }
      });
      setOtpDigits(next);
      const nextFocus = Math.min(index + chars.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = cleanVal;
    setOtpDigits(next);
    if (index < 5 && cleanVal) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const chars = pasteData.split('');
    const next = ['', '', '', '', '', ''];
    chars.forEach((c, idx) => {
      if (idx < 6) next[idx] = c;
    });
    setOtpDigits(next);
    const nextFocus = Math.min(chars.length, 5);
    otpInputRefs.current[nextFocus]?.focus();
  };

  const fillOtpAutomatically = () => {
    if (!generatedOtp) return;
    setOtpDigits(generatedOtp.split(''));
  };

  const copyOtpToClipboard = () => {
    if (!generatedOtp) return;
    try {
      navigator.clipboard?.writeText(generatedOtp);
    } catch {
      // ignore
    }
    setOtpCopied(true);
    setTimeout(() => setOtpCopied(false), 2000);
  };

  // 6. STEP 2: Verify OTP
  const handleVerifyOtp = (e) => {
    if (e) e.preventDefault();
    setRecoveryError('');

    const token = otpDigits.join('').trim();
    if (token.length !== 6) {
      setRecoveryError('Masukkan 6 digit kode OTP secara lengkap.');
      return;
    }

    if (otpExpiry && Date.now() > otpExpiry) {
      setRecoveryError('Kode OTP sudah kadaluarsa (lebih dari 5 menit). Silakan kirim ulang kode baru.');
      return;
    }

    if (token !== generatedOtp) {
      setRecoveryError('Kode OTP yang Anda masukkan salah. Silakan periksa kembali.');
      return;
    }

    playSuccessSound();
    setForgotStep('NEW_PASSWORD');
    setRecoveryError('');
  };

  // 7. STEP 3: Reset Password
  const handleResetPassword = (e) => {
    e.preventDefault();
    setRecoveryError('');
    if (newPassword.length < 4) {
      setRecoveryError('Password minimal 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Konfirmasi password tidak cocok.');
      return;
    }

    const res = resetPasswordWithPhone(recoveryPhone, newPassword);
    if (res.success) {
      playSuccessSound();
      setSuccessMessage(`Password akun "${verifiedUser?.name || res.user.name}" (${verifiedUser?.role || res.user.role}) berhasil diperbarui! Silakan masuk.`);
      setLoginIdentifier(verifiedUser?.username || verifiedUser?.phone || verifiedUser?.email || '');
      setLoginPassword(newPassword);
      closeForgotModal();
    } else {
      setRecoveryError(res.message);
    }
  };

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

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/5 space-y-5">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* 1. LOGIN FORM                                                  */}
          {/* ============================================================== */}
          {mode === 'LOGIN' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Masuk ke Aplikasi
                </h2>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama / Username / No. HP / Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Masukkan nama akun (Owner), username (admin), no. HP, atau email"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-xs text-puko-700 hover:text-puko-800 font-bold hover:underline cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan password"
                      required
                      className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-mono ${
                        showLoginPassword ? 'tracking-normal font-bold' : 'tracking-widest font-bold'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showLoginPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-puko-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Masuk</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Link ke Pendaftaran */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Belum memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('REGISTER')}
                    className="font-extrabold text-puko-700 hover:text-puko-800 hover:underline cursor-pointer"
                  >
                    Daftar di sini
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. REGISTER FORM                                               */}
          {/* ============================================================== */}
          {mode === 'REGISTER' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Daftar Akun Baru
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftarkan email Anda untuk mengelola kasir & toko PUKO
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Contoh: Owner PUKO"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alamat Email (Gmail)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="alpukatkocokpuko@gmail.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kata Sandi (Minimal 6 Karakter)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ulangi Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi di atas"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-puko-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Daftar & Kirim Kode OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Link kembali ke Login */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('LOGIN')}
                    className="font-extrabold text-puko-700 hover:text-puko-800 hover:underline cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          PUKO Alpukat Kocok &copy; {new Date().getFullYear()} &bull; Sistem Kasir POS
        </p>
      </div>

      {/* Modal Pemulihan Password via Kode OTP WhatsApp */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-puko-100 text-puko-800 flex items-center justify-center font-bold shadow-xs">
                  {forgotStep === 'PHONE' ? (
                    <Phone className="w-4 h-4 text-puko-700" />
                  ) : forgotStep === 'OTP' ? (
                    <KeyRound className="w-4 h-4 text-puko-700" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-puko-700" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {forgotStep === 'PHONE'
                      ? 'Lupa Password Akun'
                      : forgotStep === 'OTP'
                      ? 'Verifikasi Kode OTP'
                      : 'Buat Password Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {forgotStep === 'PHONE'
                      ? 'Langkah 1 dari 3: Masukkan nomor akun'
                      : forgotStep === 'OTP'
                      ? 'Langkah 2 dari 3: Masukkan 6 digit OTP'
                      : 'Langkah 3 dari 3: Tentukan password baru'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3-Step Progress Indicator */}
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              {/* Step 1 */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    forgotStep === 'PHONE'
                      ? 'bg-puko-600 text-white shadow-xs'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {forgotStep !== 'PHONE' ? '✓' : '1'}
                </span>
                <span
                  className={`text-xs font-bold ${
                    forgotStep === 'PHONE' ? 'text-puko-700' : 'text-slate-500'
                  }`}
                >
                  No. HP
                </span>
              </div>

              <div
                className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                  forgotStep !== 'PHONE' ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />

              {/* Step 2 */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    forgotStep === 'OTP'
                      ? 'bg-puko-600 text-white shadow-xs'
                      : forgotStep === 'NEW_PASSWORD'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {forgotStep === 'NEW_PASSWORD' ? '✓' : '2'}
                </span>
                <span
                  className={`text-xs font-bold ${
                    forgotStep === 'OTP'
                      ? 'text-puko-700'
                      : forgotStep === 'NEW_PASSWORD'
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  Kode OTP
                </span>
              </div>

              <div
                className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                  forgotStep === 'NEW_PASSWORD' ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />

              {/* Step 3 */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    forgotStep === 'NEW_PASSWORD'
                      ? 'bg-puko-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  3
                </span>
                <span
                  className={`text-xs font-bold ${
                    forgotStep === 'NEW_PASSWORD' ? 'text-puko-700' : 'text-slate-400'
                  }`}
                >
                  Sandi Baru
                </span>
              </div>
            </div>

            {/* Error Message inside modal */}
            {recoveryError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-semibold">{recoveryError}</span>
              </div>
            )}

            {/* ========================================================== */}
            {/* STEP 1: INPUT NO HP & KIRIM OTP                           */}
            {/* ========================================================== */}
            {forgotStep === 'PHONE' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp / HP Terdaftar
                  </label>
                  <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">
                    Masukkan nomor WhatsApp akun Admin (Owner) atau Kasir Anda untuk menerima 6 digit kode OTP pemulihan kata sandi.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      placeholder="Contoh: 085652103647"
                      required
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingOtp || !recoveryPhone.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-puko-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingOtp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengirim Kode...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Kode OTP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================== */}
            {/* STEP 2: VERIFIKASI KODE OTP                               */}
            {/* ========================================================== */}
            {forgotStep === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* Official Notification Preview & Copy Helper */}
                <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Notifikasi Kode OTP WhatsApp
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Berlaku 5 Menit
                    </span>
                  </div>

                  <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                    Kode pemulihan akun <b>{verifiedUser?.name}</b> ({verifiedUser?.role}):
                  </p>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-300 shadow-xs">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      <span className="text-lg font-black tracking-widest font-mono text-emerald-950 select-all">
                        {generatedOtp}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={copyOtpToClipboard}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Salin kode ke clipboard"
                      >
                        {otpCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={fillOtpAutomatically}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                      >
                        Isi Otomatis
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6 Digit Inputs */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    Masukkan 6 Digit Angka OTP
                  </label>

                  <div
                    className="flex items-center justify-center gap-2 sm:gap-2.5"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all font-mono outline-none shadow-xs ${
                          digit
                            ? 'border-puko-600 bg-puko-50/50 text-slate-900 ring-2 ring-puko-500/20'
                            : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-puko-500 focus:bg-white focus:ring-4 focus:ring-puko-500/15'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Resend OTP Cooldown */}
                  <div className="flex items-center justify-between text-xs mt-3 text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('PHONE')}
                      className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Ubah Nomor HP</span>
                    </button>

                    <div>
                      {otpCountdown > 0 ? (
                        <span className="text-slate-400 font-medium">
                          Kirim ulang ({otpCountdown}s)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSendingOtp}
                          className="font-extrabold text-puko-700 hover:text-puko-800 hover:underline cursor-pointer transition-colors"
                        >
                          Kirim Ulang Kode OTP
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={otpDigits.join('').length !== 6}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-puko-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi Kode OTP</span>
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================== */}
            {/* STEP 3: BUAT PASSWORD BARU                                */}
            {/* ========================================================== */}
            {forgotStep === 'NEW_PASSWORD' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Verified Account Badge */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-emerald-950">
                        {verifiedUser?.name}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                        {verifiedUser?.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-mono mt-0.5 truncate">
                      {recoveryPhone}
                    </p>
                  </div>
                </div>

                {/* Input New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru"
                      required
                      autoFocus
                      minLength={4}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showForgotNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Input Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      minLength={4}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowForgotConfirmPassword(!showForgotConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showForgotConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 text-white text-xs font-bold shadow-md shadow-puko-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Password Baru</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

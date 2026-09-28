import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  ArrowRight,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const LoginPage = () => {
  const {
    user,
    isAuthenticated,
    login,
    loginWithGoogle,
    signUpWithEmail,
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Modal Bantuan Lupa Password
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // Switch mode helper
  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

  // 1. Submit LOGIN (Username/Email/Phone + Password)
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

  // 2. Submit LOGIN DENGAN GOOGLE (1-Click Google OAuth)
  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');
    setIsGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setError(res.message);
        setIsGoogleLoading(false);
      }
      // Jika berhasil, Supabase akan otomatis me-redirect ke Google
    } catch (err) {
      setError(err.message || 'Gagal menghubungkan dengan Google. Coba lagi.');
      setIsGoogleLoading(false);
    }
  };

  // 3. Submit REGISTER (Email baru)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpWithEmail(regName, regEmail, regPassword);

      if (result.needsConfirmation) {
        navigate('/verify-email', {
          state: { email: result.email },
        });
      } else {
        playSuccessSound();
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Pendaftaran gagal. Pastikan email Anda valid.');
    } finally {
      setIsLoading(false);
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

          {/* ============================================================== */}
          {/* 1. LOGIN FORM                                                  */}
          {/* ============================================================== */}
          {mode === 'LOGIN' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Masuk ke Aplikasi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan username & password atau masuk langsung via Google
                </p>
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
                      placeholder="Contoh: Owner, admin, atau 0856xxxxxx"
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
                      onClick={() => setShowForgotHelp(true)}
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

                {/* Tombol Masuk Biasa */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-puko-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
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

                {/* Divider ATAU */}
                <div className="relative my-3 pt-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2.5 text-slate-400 font-extrabold tracking-wider">
                      Atau
                    </span>
                  </div>
                </div>

                {/* Tombol Masuk Menggunakan Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-sm shadow-xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Menghubungkan ke Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.39 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.13z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                        />
                      </svg>
                      <span>Masuk Menggunakan Google</span>
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
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-puko-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Daftar Akun</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider ATAU */}
                <div className="relative my-3 pt-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2.5 text-slate-400 font-extrabold tracking-wider">
                      Atau
                    </span>
                  </div>
                </div>

                {/* Tombol Daftar Menggunakan Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-sm shadow-xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Menghubungkan ke Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.39 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.13z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                        />
                      </svg>
                      <span>Daftar / Masuk via Google</span>
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

      {/* Modal Bantuan Lupa Password */}
      {showForgotHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
                  <HelpCircle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Bantuan Lupa Password
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Panduan akses masuk akun Owner & Kasir
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotHelp(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Cards */}
            <div className="space-y-3">
              {/* Info untuk Owner */}
              <div className="p-4 rounded-2xl bg-puko-50/70 border border-puko-200/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-puko-600 text-white flex items-center justify-center text-xs font-black">
                    👑
                  </span>
                  <h4 className="font-extrabold text-puko-950 text-xs">
                    Untuk Akun Owner / Admin:
                  </h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Jika lupa kata sandi akun Owner, Anda tidak perlu repot reset password! Cukup gunakan tombol <b>"Masuk Menggunakan Google"</b> dengan akun Gmail Anda (contoh: <code>alpukatkocokpuko@gmail.com</code>).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotHelp(false);
                    handleGoogleLogin();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-puko-600 hover:bg-puko-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Langsung Masuk via Google Sekarang</span>
                </button>
              </div>

              {/* Info untuk Kasir */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-black">
                    🥑
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-xs">
                    Untuk Akun Kasir Outlet:
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Untuk kasir yang lupa password atau PIN, silakan hubungi <b>Owner</b> toko Anda. Owner dapat melihat atau mengubah PIN kasir kapan saja di menu:
                  <br />
                  <span className="font-bold text-slate-800">
                    Pengaturan &rarr; Toko & Kasir &rarr; Kelola Akun Kasir
                  </span>.
                </p>
              </div>
            </div>

            {/* Tombol Tutup */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowForgotHelp(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

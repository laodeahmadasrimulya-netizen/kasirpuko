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
  Sparkles,
  Phone,
  CheckCircle2,
  X,
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

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

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

  // Forgot password handlers
  const handleVerifyPhone = (e) => {
    e.preventDefault();
    setRecoveryError('');
    const target = findUserByPhone(recoveryPhone);
    if (!target) {
      setRecoveryError('Nomor WhatsApp ini tidak ditemukan di sistem.');
      return;
    }
    setVerifiedUser(target);
  };

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
      setSuccessMessage(`Password akun "${res.user.name}" berhasil diperbarui! Silakan masuk.`);
      setLoginIdentifier(res.user.username || res.user.email || '');
      setLoginPassword(newPassword);
      setIsForgotModalOpen(false);
      setVerifiedUser(null);
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

      {/* Modal Pemulihan Password via Nomor HP */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-puko-100 text-puko-800 flex items-center justify-center font-bold">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Pemulihan Kata Sandi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setVerifiedUser(null);
                  setRecoveryError('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error in modal */}
            {recoveryError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{recoveryError}</span>
              </div>
            )}

            {!verifiedUser ? (
              <form onSubmit={handleVerifyPhone} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp Terdaftar
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Masukkan nomor WhatsApp akun Anda (contoh: <code>085652103647</code>) untuk verifikasi.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={recoveryPhone}
                      onChange={(e) => setRecoveryPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Verifikasi Nomor
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Nomor Terverifikasi!</span>
                    <p className="text-[11px] text-emerald-700">
                      Akun: <strong>{verifiedUser.name}</strong> ({verifiedUser.role})
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setVerifiedUser(null)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Ganti Nomor
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Simpan Password Baru
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

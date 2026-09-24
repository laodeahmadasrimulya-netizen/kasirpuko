import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Phone,
  CheckCircle2,
  X,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const LoginPage = () => {
  const { login, findUserByPhone, resetPasswordWithPhone, users } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('ADMIN'); // 'ADMIN' | 'KASIR'
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Akun Admin dan Kasir aktif
  const adminAccount = useMemo(() => {
    return (
      users?.find((u) => u.role === 'ADMIN') || {
        username: 'admin',
        pin: '1234',
        name: 'Owner',
      }
    );
  }, [users]);

  const kasirAccount = useMemo(() => {
    return (
      users?.find((u) => u.role === 'KASIR') || {
        username: 'kasir',
        pin: '0000',
        name: 'Kasir 01',
      }
    );
  }, [users]);

  // Handler memilih peran (sekaligus mengisi username & sandi otomatis)
  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setError('');
    if (role === 'ADMIN') {
      setUsername(adminAccount.username);
      setPin(adminAccount.pin);
    } else {
      setUsername(kasirAccount.username);
      setPin(kasirAccount.pin);
    }
  };

  // Isi awal saat pertama kali buka aplikasi
  useEffect(() => {
    if (!username && !pin) {
      if (selectedRole === 'ADMIN') {
        setUsername(adminAccount.username);
        setPin(adminAccount.pin);
      } else {
        setUsername(kasirAccount.username);
        setPin(kasirAccount.pin);
      }
    }
  }, [selectedRole, adminAccount, kasirAccount]);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    const result = login(username, pin);
    if (result.success) {
      if (selectedRole && result.user.role !== selectedRole) {
        setError(
          selectedRole === 'ADMIN'
            ? 'Akun ini terdaftar sebagai Kasir. Silakan pilih masuk sebagai Kasir.'
            : 'Akun ini terdaftar sebagai Admin. Silakan pilih masuk sebagai Admin.'
        );
        setIsLoading(false);
        return;
      }

      playSuccessSound();
      navigate(result.user.role === 'ADMIN' ? '/dashboard' : '/kasir', { replace: true });
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    const target = findUserByPhone(recoveryPhone);
    if (!target) {
      setRecoveryError(
        'Nomor WhatsApp ini tidak ditemukan di sistem. Pastikan nomor sesuai dengan yang terdaftar.'
      );
      return;
    }

    setVerifiedUser(target);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setRecoveryError('');

    if (newPassword.length < 4) {
      setRecoveryError('Password minimal 4 karakter / digit.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError('Konfirmasi password tidak cocok.');
      return;
    }

    const res = resetPasswordWithPhone(recoveryPhone, newPassword);
    if (res.success) {
      playSuccessSound();
      setSuccessMessage(
        `Password untuk akun "${res.user.name}" (${res.user.role}) berhasil diperbarui! Silakan masuk.`
      );
      setUsername(res.user.username);
      setPin(newPassword);
      setIsForgotModalOpen(false);
      setVerifiedUser(null);
      setRecoveryPhone('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setRecoveryError(res.message);
    }
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setVerifiedUser(null);
    setRecoveryPhone('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryError('');
    setRecoverySuccess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-slate-100 to-slate-200 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-puko-500 selection:text-white">
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div className="inline-block relative">
            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-white p-1 shadow-lg border border-slate-200/80">
              <img
                src="/logo.png"
                alt="PUKO Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-wider text-slate-900">
              PUKO
            </h1>
            <p className="text-xs font-bold text-slate-600 tracking-wide mt-1">
              Alpukat Kocok No Serat No Pahit
            </p>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          {/* Pilih Masuk Sebagai Admin atau Kasir */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider text-center">
              Pilih Masuk Sebagai
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSelectRole('ADMIN')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  selectedRole === 'ADMIN'
                    ? 'bg-puko-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    selectedRole === 'ADMIN' ? 'text-puko-100' : 'text-slate-500'
                  }`}
                >
                  Sandi:{' '}
                  <strong
                    className={
                      selectedRole === 'ADMIN'
                        ? 'text-white font-black'
                        : 'text-puko-700 font-bold'
                    }
                  >
                    {adminAccount.pin}
                  </strong>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('KASIR')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  selectedRole === 'KASIR'
                    ? 'bg-puko-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Kasir</span>
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    selectedRole === 'KASIR' ? 'text-puko-100' : 'text-slate-500'
                  }`}
                >
                  Sandi:{' '}
                  <strong
                    className={
                      selectedRole === 'KASIR'
                        ? 'text-white font-black'
                        : 'text-puko-700 font-bold'
                    }
                  >
                    {kasirAccount.pin}
                  </strong>
                </span>
              </button>
            </div>
          </div>

          {/* Card Info Sandi Masuk: Perlihatkan sandi masuk Admin dan Kasir */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-puko-600" />
                Sandi Masuk Akun:
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Klik untuk memilih</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Box Admin */}
              <button
                type="button"
                onClick={() => handleSelectRole('ADMIN')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'ADMIN'
                    ? 'border-puko-600 bg-white ring-2 ring-puko-500/20 shadow-xs'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    Admin
                  </span>
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-extrabold">
                    Owner
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  User: <span className="font-mono font-bold text-slate-700">{adminAccount.username}</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Sandi:{' '}
                  <span className="font-mono font-black text-puko-700 bg-puko-50 border border-puko-200 px-1.5 py-0.2 rounded">
                    {adminAccount.pin}
                  </span>
                </div>
              </button>

              {/* Box Kasir */}
              <button
                type="button"
                onClick={() => handleSelectRole('KASIR')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'KASIR'
                    ? 'border-puko-600 bg-white ring-2 ring-puko-500/20 shadow-xs'
                    : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Kasir
                  </span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold">
                    Outlet
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  User: <span className="font-mono font-bold text-slate-700">{kasirAccount.username}</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Sandi:{' '}
                  <span className="font-mono font-black text-puko-700 bg-puko-50 border border-puko-200 px-1.5 py-0.2 rounded">
                    {kasirAccount.pin}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau no. WhatsApp"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all placeholder:text-slate-400"
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
                  onClick={() => {
                    setIsForgotModalOpen(true);
                    setRecoveryError('');
                  }}
                  className="text-xs text-puko-700 hover:text-puko-800 font-bold hover:underline cursor-pointer"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className={`w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 focus:bg-white transition-all placeholder:text-slate-400 font-mono ${
                    showPin ? 'tracking-normal font-bold' : 'tracking-widest font-bold'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showPin ? 'Sembunyikan sandi' : 'Perlihatkan sandi'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-puko-600 hover:bg-puko-700 text-white font-extrabold text-sm shadow-md shadow-puko-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          PUKO Alpukat Kocok &copy; {new Date().getFullYear()} &bull; Sistem Kasir POS
        </p>
      </div>

      {/* Modal Pemulihan Password via Nomor WhatsApp */}
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
                  Pemulihan Password via No. HP
                </h3>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
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

            {/* Step 1: Input Phone Number */}
            {!verifiedUser ? (
              <form onSubmit={handleVerifyPhone} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp Terdaftar
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Masukkan nomor WhatsApp akun Owner/Kasir (contoh: <code>085652103647</code>) untuk verifikasi.
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
                    onClick={closeForgotModal}
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
              /* Step 2: Set New Password */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Nomor Terverifikasi!</span>
                    <p className="text-[11px] text-emerald-700">
                      Akun: <strong>{verifiedUser.name}</strong> (@{verifiedUser.username})
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

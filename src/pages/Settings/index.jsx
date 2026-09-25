import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Store,
  Printer,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  User,
  Coffee,
  LogOut,
  Phone,
  Mail,
} from 'lucide-react';
import { ProductsPage } from '../Products';
import { useSettings } from '../../context/SettingsContext';
import { useProducts } from '../../context/ProductContext';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import {
  playAddMenuSound,
  playSuccessSound,
  playPrintReceiptSound,
  setSoundEnabled,
} from '../../utils/sound';

export const SettingsPage = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { resetProducts } = useProducts();
  const { clearHistory } = useTransactions();
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    resetUsers,
    isAdmin,
    user: currentUser,
    logout,
  } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'menu' ? 'menu' : 'outlet');

  useEffect(() => {
    if (tabParam === 'outlet' || tabParam === 'menu') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const [form, setForm] = useState({
    storeName: '',
    tagline: '',
    branch: '',
    address: '',
    phone: '',
    cashierName: '',
    receiptFooter: '',
    enableSound: true,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cashier management states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null when adding new
  const [userFormData, setUserFormData] = useState({
    name: '',
    username: '',
    pin: '',
    phone: '',
    role: 'KASIR',
  });
  const [userModalError, setUserModalError] = useState('');
  const [showModalPin, setShowModalPin] = useState(false);
  const [revealedPins, setRevealedPins] = useState({}); // { [userId]: boolean }
  const [userSuccessMessage, setUserSuccessMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        storeName: settings.storeName || 'PUKO',
        tagline: settings.tagline || 'Alpukat Kocok No Serat No Pahit',
        branch: settings.branch || '',
        address: settings.address || '',
        phone: settings.phone || '',
        cashierName: settings.cashierName || '',
        receiptFooter: settings.receiptFooter || '',
        enableSound: settings.enableSound !== false,
      });
      setSoundEnabled(settings.enableSound !== false);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSoundToggle = async (enabled) => {
    handleChange('enableSound', enabled);
    setSoundEnabled(enabled);
    try {
      await updateSettings({ ...form, enableSound: enabled });
    } catch (err) {
      console.error('Gagal memperbarui pengaturan suara:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSoundEnabled(form.enableSound);
    await updateSettings(form);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetAllData = async () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mengembalikan seluruh aplikasi (menu, transaksi, setting, dan akun kasir) ke data bawaan demo PUKO?'
      )
    ) {
      await resetSettings();
      await resetProducts();
      await clearHistory();
      resetUsers();
      alert('Semua data berhasil direset ke kondisi default!');
    }
  };

  // --- Cashier Management Handlers ---
  const handleTogglePinVisibility = (userId) => {
    setRevealedPins((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      username: '',
      pin: '',
      phone: '',
      role: 'KASIR',
    });
    setUserModalError('');
    setShowModalPin(false);
    setIsUserModalOpen(true);
  };

  const handleOpenEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setUserFormData({
      name: targetUser.name,
      username: targetUser.username,
      pin: targetUser.pin,
      phone: targetUser.phone || '',
      role: targetUser.role || 'KASIR',
    });
    setUserModalError('');
    setShowModalPin(false);
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
    setUserModalError('');
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    setUserModalError('');

    try {
      if (editingUser) {
        // Update user
        updateUser(editingUser.id, {
          name: userFormData.name,
          username: userFormData.username,
          pin: userFormData.pin,
          phone: userFormData.phone,
          role: editingUser.role || 'KASIR',
        });
        setUserSuccessMessage(`Akun "${userFormData.name}" berhasil diperbarui!`);
      } else {
        // Add new user
        addUser({
          name: userFormData.name,
          username: userFormData.username,
          pin: userFormData.pin,
          phone: userFormData.phone,
          role: 'KASIR',
        });
        setUserSuccessMessage(`Kasir baru "${userFormData.name}" berhasil ditambahkan!`);
      }

      handleCloseUserModal();
      setTimeout(() => setUserSuccessMessage(''), 3500);
    } catch (err) {
      setUserModalError(err.message || 'Terjadi kesalahan saat menyimpan data kasir.');
    }
  };

  const handleDeleteUser = (targetUser) => {
    if (targetUser.role === 'ADMIN') {
      const adminCount = users.filter((u) => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        alert('Tidak dapat menghapus akun Admin utama.');
        return;
      }
    }

    const isCurrent = currentUser?.id === targetUser.id;
    const confirmMsg = isCurrent
      ? `Perhatian: Anda sedang login dengan akun "${targetUser.name}". Jika dihapus, Anda akan otomatis logout. Tetap lanjutkan?`
      : `Apakah Anda yakin ingin menghapus akun kasir "${targetUser.name}" (@${targetUser.username})?`;

    if (window.confirm(confirmMsg)) {
      try {
        deleteUser(targetUser.id);
        setUserSuccessMessage(`Akun "${targetUser.name}" berhasil dihapus.`);
        setTimeout(() => setUserSuccessMessage(''), 3500);
      } catch (err) {
        alert(err.message || 'Gagal menghapus akun.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800">
            Pengaturan & Menu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola menu produk, identitas outlet, akun staf kasir, dan format cetak struk.
          </p>
        </div>

        {/* Tab Buttons: Terpisah (Bukan kotak menyatu) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange('outlet')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
              activeTab === 'outlet'
                ? 'bg-puko-600 text-white border-puko-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Store className={`w-4 h-4 ${activeTab === 'outlet' ? 'text-white' : 'text-slate-500'}`} />
            <span>Profil Outlet & Kasir</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('menu')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
              activeTab === 'menu'
                ? 'bg-puko-600 text-white border-puko-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Coffee className={`w-4 h-4 ${activeTab === 'menu' ? 'text-white' : 'text-slate-500'}`} />
            <span>Kelola Menu</span>
          </button>
        </div>
      </div>

      {/* TAB 1: KELOLA MENU PRODUK */}
      {activeTab === 'menu' && (
        <div className="pt-1 animate-fadeIn">
          <ProductsPage />
        </div>
      )}

      {/* TAB 2: PROFIL OUTLET, AKUN KASIR, STRUK, SUARA */}
      {activeTab === 'outlet' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Messages */}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Perubahan pengaturan toko berhasil disimpan!</span>
        </div>
      )}

      {userSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{userSuccessMessage}</span>
        </div>
      )}

      {/* --- MANAJEMEN AKUN KASIR & STAF OUTLET (ADMIN ONLY) --- */}
      {isAdmin && (
        <Card className="space-y-4 border-puko-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-slate-900 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span>Manajemen Akun Kasir</span>
                  <span className="inline-flex items-center justify-center text-[10px] font-bold leading-none bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                    {users.length} Akun
                  </span>
                </h3>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={handleOpenAddModal}
              className="shrink-0"
            >
              Tambah Kasir Baru
            </Button>
          </div>

          {/* Table of Cashier Accounts */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 rounded-l-lg">Nama & Akun</th>
                  <th className="py-2.5 px-3">Identitas Login</th>
                  <th className="py-2.5 px-3">Password / PIN</th>
                  <th className="py-2.5 px-3">Peran & Akses</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isPinShown = Boolean(revealedPins[u.id]);
                  const isSelf = currentUser?.id === u.id;
                  const isOwner = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            {u.name}
                            {isOwner && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded border border-amber-200">
                                Owner Utama
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                                (Anda)
                              </span>
                            )}
                          </p>
                          {isOwner ? (
                            <p className="text-[11px] text-amber-800 font-semibold flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-amber-600" />
                              {u.email || 'alpukatkocokpuko@gmail.com'}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400">ID: {u.id}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div>
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold inline-block">
                            @{u.username}
                          </span>
                          {u.phone && (
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {u.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold tracking-widest text-xs min-w-[36px]">
                            {isPinShown ? u.pin : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePinVisibility(u.id)}
                            title={isPinShown ? 'Sembunyikan Password' : 'Lihat Password'}
                            className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            {isPinShown ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isOwner
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isOwner ? 'Owner (Akses Penuh)' : 'Kasir (Khusus POS)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={Pencil}
                            onClick={() => handleOpenEditModal(u)}
                            className="!px-2.5 !py-1 text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            disabled={isOwner}
                            onClick={() => handleDeleteUser(u)}
                            className="!px-2.5 !py-1 text-xs"
                            title={
                              isOwner
                                ? 'Akun Owner utama tidak dapat dihapus'
                                : 'Hapus akun kasir ini'
                            }
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- FORM IDENTITAS OUTLET & PENGATURAN STRUK --- */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Profil Toko Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store className="w-5 h-5 text-slate-900" />
            <h3 className="font-bold text-slate-800 text-sm">
              Usaha Saya
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nama Brand / Usaha"
              value={form.storeName}
              onChange={(e) => handleChange('storeName', e.target.value)}
              required
            />
            <Input
              label="Slogan / Tagline"
              value={form.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nama Cabang / Outlet"
              value={form.branch}
              onChange={(e) => handleChange('branch', e.target.value)}
            />
            <Input
              label="No. WhatsApp / Telepon"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>

          <Input
            label="Alamat Outlet"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
        </Card>

        {/* Kasir & Struk Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Printer className="w-5 h-5 text-slate-900" />
            <h3 className="font-bold text-slate-800 text-sm">
              Struk
            </h3>
          </div>

          <Input
            label="Label Nama Kasir Default (Shift Ini)"
            value={form.cashierName}
            onChange={(e) => handleChange('cashierName', e.target.value)}
            helperText="Saat transaksi, nama kasir otomatis mengikuti akun: jika Admin menjual maka nama di struk 'Owner', jika kasir maka nama kasir yang bertugas. Kolom ini sebagai nama cadangan."
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Pesan Footer Struk
            </label>
            <textarea
              rows={3}
              value={form.receiptFooter}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-puko-500 font-mono"
              placeholder="Pesan ucapan terima kasih dan promosi sosial media di bagian bawah struk..."
            />
          </div>
        </Card>

        {/* Efek Suara Kasir Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              {form.enableSound ? (
                <Volume2 className="w-5 h-5 text-slate-900 shrink-0" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Suara
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      form.enableSound
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {form.enableSound ? 'Suara Aktif' : 'Mati / Senyap'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Bunyi nada ceria saat menambah menu, selesai transaksi, dan mencetak struk.
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.enableSound}
                onChange={(e) => handleSoundToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-puko-600"></div>
            </label>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              {form.enableSound ? 'Tes Bunyi Suara:' : 'Tes Bunyi Suara (Nonaktif):'}
            </span>
            <div className="flex flex-wrap gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={playAddMenuSound}
                icon={Volume2}
                disabled={!form.enableSound}
              >
                1. Tes Tambah Menu
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={playSuccessSound}
                icon={Sparkles}
                disabled={!form.enableSound}
              >
                2. Tes Selesai Transaksi
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={playPrintReceiptSound}
                icon={Printer}
                disabled={!form.enableSound}
              >
                3. Tes Cetak Struk
              </Button>
            </div>
            {!form.enableSound && (
              <p className="text-[11px] text-slate-400 italic">
                * Suara dinonaktifkan. Semua aksi kasir dan transaksi akan berjalan senyap tanpa bunyi nada.
              </p>
            )}
          </div>
        </Card>

        {/* Save Button with clear feedback */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-700">
              Simpan Pengaturan
            </p>
            <p className="text-[11px] text-slate-500">
              Perubahan identitas toko, nama kasir, dan pesan footer struk akan langsung aktif di seluruh sistem.
            </p>
          </div>
          <Button
            variant={saveSuccess ? 'success' : 'primary'}
            size="lg"
            type="submit"
            icon={saveSuccess ? CheckCircle2 : Save}
            className={`transition-all ${saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            {saveSuccess ? 'Berhasil Disimpan! ✓' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>

      {/* Danger Zone: Reset All Demo Data */}
      <Card className="border-rose-200 bg-rose-50/30 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-rose-900 text-sm">
            Area Reset Data Demo (Local Storage)
          </h3>
        </div>
        <p className="text-xs text-slate-600">
          Gunakan tombol di bawah ini jika Anda ingin mengembalikan menu, transaksi, setting, dan akun kasir kembali ke data awal bawaan demo PUKO.
        </p>

        <div className="pt-2">
          <Button
            variant="danger"
            size="sm"
            type="button"
            onClick={handleResetAllData}
            icon={RotateCcw}
          >
            Reset Semua Data ke Default Demo
          </Button>
        </div>
      </Card>

      {/* Tombol Keluar dari Akun (Logout) */}
      <div className="pt-2">
        <Button
          type="button"
          variant="danger"
          size="lg"
          fullWidth
          icon={LogOut}
          onClick={logout}
          className="font-bold text-sm py-3.5 shadow-sm cursor-pointer"
        >
          Keluar dari Akun (Logout)
        </Button>
      </div>
        </div>
      )}

      {/* --- MODAL TAMBAH / EDIT KASIR & OWNER --- */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        title={
          editingUser
            ? editingUser.role === 'ADMIN'
              ? `Edit Akun Owner: ${editingUser.name}`
              : `Edit Akun Kasir: ${editingUser.name}`
            : 'Tambah Kasir Baru'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {userModalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{userModalError}</span>
            </div>
          )}

          {/* Information box for Cashier vs Owner */}
          {editingUser?.role === 'ADMIN' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold">Akun Owner Utama</p>
                <p className="text-[11px] text-amber-800">
                  Email akun: <strong>alpukatkocokpuko@gmail.com</strong>. Memiliki kendali penuh atas semua data POS, menu, kasir, dan laporan.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold">Hak Akses Kasir Outlet</p>
                <p className="text-[11px] text-emerald-800">
                  Kasir hanya dapat mengakses Mesin POS, Riwayat Transaksi, dan Pengeluaran Operasional.
                </p>
              </div>
            </div>
          )}

          {editingUser?.role === 'ADMIN' && (
            <div>
              <Input
                label="Email Login Owner"
                value="alpukatkocokpuko@gmail.com"
                readOnly
                icon={Mail}
                helperText="Email utama untuk masuk ke akun Owner"
              />
            </div>
          )}

          <div>
            <Input
              label={editingUser?.role === 'ADMIN' ? 'Nama Owner' : 'Nama Kasir'}
              placeholder={editingUser?.role === 'ADMIN' ? 'Owner' : 'Contoh: Siti Rahma'}
              value={userFormData.name}
              onChange={(e) =>
                setUserFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              icon={User}
              required
            />
          </div>

          <div>
            <Input
              label={editingUser?.role === 'ADMIN' ? 'Username Alternatif' : 'Username Kasir'}
              placeholder={editingUser?.role === 'ADMIN' ? 'admin' : 'Contoh: kasir01'}
              value={userFormData.username}
              onChange={(e) =>
                setUserFormData((prev) => ({
                  ...prev,
                  username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                }))
              }
              icon={Users}
              helperText={
                editingUser?.role === 'ADMIN'
                  ? 'Owner dapat login menggunakan Email atau Username ini'
                  : 'Digunakan oleh kasir untuk masuk di layar login'
              }
              required
            />
          </div>

          <div>
            <Input
              label="No. Telepon / WhatsApp"
              placeholder="Contoh: 085652103647"
              value={userFormData.phone}
              onChange={(e) =>
                setUserFormData((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              icon={Phone}
              helperText="Digunakan untuk pemulihan password jika lupa"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {editingUser?.role === 'ADMIN' ? 'Password Owner' : 'PIN / Sandi Kasir'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showModalPin ? 'text' : 'password'}
                value={userFormData.pin}
                onChange={(e) =>
                  setUserFormData((prev) => ({ ...prev, pin: e.target.value }))
                }
                placeholder="Masukkan kata sandi / PIN"
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-puko-500 font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowModalPin(!showModalPin)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showModalPin ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {editingUser?.role === 'ADMIN'
                ? 'Gunakan password yang kuat untuk keamanan toko Anda'
                : 'PIN / sandi yang akan diketik kasir saat login'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleCloseUserModal}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingUser ? 'Simpan Perubahan' : 'Tambah Kasir'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


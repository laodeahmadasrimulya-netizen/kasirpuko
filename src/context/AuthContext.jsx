import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const STORAGE_KEY = 'puko_auth_user';
const USERS_STORAGE_KEY = 'puko_users_list';

export const OWNER_EMAIL = 'alpukatkocokpuko@gmail.com';

export const DEFAULT_USERS = [
  {
    id: 'usr-admin',
    username: 'admin',
    email: OWNER_EMAIL,
    pin: '1234',
    name: 'Owner',
    role: 'ADMIN',
    phone: '085652103647',
    avatar: '🥑',
    roleLabel: 'Admin / Owner',
    roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  },
  {
    id: 'usr-kasir',
    username: 'kasir',
    email: '',
    pin: '0000',
    name: 'Kasir 01',
    role: 'KASIR',
    phone: '',
    avatar: '🥑',
    roleLabel: 'Kasir Outlet',
    roleBadgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  },
];

export const normalizePhone = (num) => {
  if (!num) return '';
  let clean = String(num).replace(/[\s\-\(\)\.]/g, '');
  if (clean.startsWith('+62')) clean = '0' + clean.slice(3);
  else if (clean.startsWith('62')) clean = '0' + clean.slice(2);
  return clean;
};

export const USERS = DEFAULT_USERS;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // List of all accounts (Admin & Cashiers)
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u) => {
            let updated = u;
            if (updated.id === 'usr-admin' || updated.role === 'ADMIN') {
              if (updated.name === 'Owner / Supervisor' || !updated.name) {
                updated = { ...updated, name: 'Owner' };
              }
              if (!updated.phone) {
                updated = { ...updated, phone: '085652103647' };
              }
              if (!updated.email) {
                updated = { ...updated, email: OWNER_EMAIL };
              }
            }
            if (updated.avatar === '👑') {
              updated = { ...updated, avatar: '🥑' };
            }
            return updated;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load users list:', err);
    }
    return DEFAULT_USERS;
  });

  // Active logged in user
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (parsed?.id === 'usr-admin' || parsed?.role === 'ADMIN') {
          if (parsed?.name === 'Owner / Supervisor' || !parsed?.name) {
            parsed = { ...parsed, name: 'Owner' };
          }
          if (!parsed?.phone) {
            parsed = { ...parsed, phone: '085652103647' };
          }
          if (!parsed?.email) {
            parsed = { ...parsed, email: OWNER_EMAIL };
          }
        }
        if (parsed?.avatar === '👑') {
          parsed = { ...parsed, avatar: '🥑' };
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Load users from Supabase on mount
  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email || (u.role === 'ADMIN' ? OWNER_EMAIL : ''),
            pin: u.pin,
            name: u.name,
            role: u.role || 'KASIR',
            phone: u.phone || '',
            avatar: u.avatar || '🥑',
            roleLabel: u.role === 'ADMIN' ? 'Admin / Owner' : 'Kasir Outlet',
            roleBadgeColor:
              u.role === 'ADMIN'
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
          }));
          setUsers(mapped);
        }
      });
  }, []);

  // Listen to Supabase Auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const authUser = session.user;
        const matched = users.find(
          (u) => u.email?.toLowerCase() === authUser.email?.toLowerCase()
        );
        const activeUser = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || matched?.name || 'Owner',
          role: authUser.user_metadata?.role || matched?.role || 'ADMIN',
          username: matched?.username || authUser.email?.split('@')[0],
          phone: authUser.user_metadata?.phone || matched?.phone || '',
          avatar: '🥑',
          roleLabel: 'Admin / Owner',
          roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
        };
        setUser(activeUser);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser = session.user;
        const matched = users.find(
          (u) => u.email?.toLowerCase() === authUser.email?.toLowerCase()
        );
        const activeUser = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || matched?.name || 'Owner',
          role: authUser.user_metadata?.role || matched?.role || 'ADMIN',
          username: matched?.username || authUser.email?.split('@')[0],
          phone: authUser.user_metadata?.phone || matched?.phone || '',
          avatar: '🥑',
          roleLabel: 'Admin / Owner',
          roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
        };
        setUser(activeUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [users]);

  // Sync users list to localStorage
  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  // Sync active user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  /**
   * Login with Email or Username and Password / PIN
   * Supports Supabase Auth (Email + Password) and Local/Database Users (Username + PIN)
   */
  const login = async (identifier, secret) => {
    const trimmedId = (identifier || '').trim();
    const normalizedIdPhone = normalizePhone(identifier);
    const trimmedSecret = (secret || '').trim();

    if (!trimmedId) {
      return { success: false, message: 'Email atau username wajib diisi.' };
    }
    if (!trimmedSecret) {
      return { success: false, message: 'Password / sandi wajib diisi.' };
    }

    const isEmail = trimmedId.includes('@');

    // 1. If it's an email, attempt Supabase Auth first
    if (isEmail) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedId.toLowerCase(),
          password: trimmedSecret,
        });

        if (!error && data.user) {
          const matched = users.find(
            (u) => u.email?.toLowerCase() === data.user.email?.toLowerCase()
          );
          const activeUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || matched?.name || 'Owner',
            role: data.user.user_metadata?.role || matched?.role || 'ADMIN',
            username: matched?.username || data.user.email?.split('@')[0],
            phone: data.user.user_metadata?.phone || matched?.phone || '',
            avatar: '🥑',
            roleLabel: 'Admin / Owner',
            roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
          };
          setUser(activeUser);
          return { success: true, user: activeUser };
        }

        // Check if email is unconfirmed in Supabase
        if (error?.message?.toLowerCase().includes('email not confirmed')) {
          return {
            success: false,
            code: 'EMAIL_NOT_CONFIRMED',
            email: trimmedId.toLowerCase(),
            message:
              'Email Anda belum diverifikasi. Masukkan 6-digit kode konfirmasi yang telah dikirim ke akun Gmail Anda.',
          };
        }
      } catch (err) {
        console.warn('Supabase auth signIn error:', err);
      }
    }

    // 2. Check local/database users list (for Cashiers or fallback Owner)
    let storePhone = '';
    try {
      const savedSettings = localStorage.getItem('puko_settings');
      if (savedSettings) {
        storePhone = normalizePhone(JSON.parse(savedSettings)?.phone);
      }
    } catch {
      // ignore
    }

    const isMatch = (u) => {
      const uPhone = normalizePhone(u.phone);
      const uEmail = (u.email || (u.role === 'ADMIN' ? OWNER_EMAIL : '')).toLowerCase();
      const uUsername = (u.username || '').toLowerCase();

      const phoneMatched =
        Boolean(normalizedIdPhone) &&
        (uPhone === normalizedIdPhone || (u.role === 'ADMIN' && storePhone === normalizedIdPhone));

      const idMatched =
        uUsername === trimmedId.toLowerCase() ||
        uEmail === trimmedId.toLowerCase() ||
        phoneMatched;

      if (!idMatched) return false;
      return u.pin === trimmedSecret;
    };

    const found = users.find(isMatch);

    if (found) {
      setUser(found);
      return { success: true, user: found };
    }

    return {
      success: false,
      message: 'Email/Username atau Kata Sandi salah. Periksa kembali data login Anda.',
    };
  };

  /**
   * Register a new Owner account via Supabase Auth
   * Automatically sends a 6-digit confirmation code to Gmail
   */
  const signUpWithEmail = async (name, email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const cleanName = (name || '').trim();

    if (!cleanName) throw new Error('Nama lengkap wajib diisi.');
    if (!cleanEmail) throw new Error('Email Gmail wajib diisi.');
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: cleanName,
          role: 'ADMIN',
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Email ini sudah terdaftar. Silakan langsung masuk menggunakan email & password Anda.');
      }
      throw error;
    }

    // If session was created immediately (email confirmation disabled in Supabase)
    if (data.session) {
      const activeUser = {
        id: data.user.id,
        email: data.user.email,
        name: cleanName,
        role: 'ADMIN',
        username: cleanEmail.split('@')[0],
        avatar: '🥑',
        roleLabel: 'Admin / Owner',
        roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
      };
      setUser(activeUser);
      return { success: true, needsConfirmation: false, user: activeUser };
    }

    return {
      success: true,
      needsConfirmation: true,
      email: cleanEmail,
      user: data.user,
    };
  };

  /**
   * Verify 6-digit confirmation code from Gmail
   */
  const verifyEmailOtp = async (email, token) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (token || '').trim();

    if (!cleanToken) {
      throw new Error('Kode konfirmasi 6-digit wajib diisi.');
    }

    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (error) {
      // Fallback to 'email' type if 'signup' fails
      const retry = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });
      if (retry.error) {
        throw new Error('Kode konfirmasi tidak valid atau sudah kadaluarsa. Periksa kembali kode di Gmail Anda.');
      }
      data = retry.data;
    }

    if (data?.user) {
      const activeUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || 'Owner',
        role: 'ADMIN',
        username: cleanEmail.split('@')[0],
        avatar: '🥑',
        roleLabel: 'Admin / Owner',
        roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
      };
      setUser(activeUser);

      // Upsert into public.users table in background
      try {
        supabase.from('users').upsert({
          id: data.user.id,
          username: cleanEmail.split('@')[0],
          name: activeUser.name,
          role: 'ADMIN',
          avatar: '🥑',
          pin: '1234',
        }).then(() => {});
      } catch (e) {
        console.warn('Upsert public.users after verify:', e);
      }

      return { success: true, user: activeUser };
    }

    throw new Error('Verifikasi gagal. Pastikan kode konfirmasi sesuai dengan yang masuk di Gmail.');
  };

  /**
   * Resend 6-digit confirmation code to Gmail
   */
  const resendOtp = async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      throw new Error(error.message || 'Gagal mengirim ulang kode. Silakan coba lagi sebentar lagi.');
    }
    return true;
  };

  /**
   * Find user by registered phone number (or store phone for admin)
   */
  const findUserByPhone = (phone) => {
    const targetPhone = normalizePhone(phone);
    if (!targetPhone) return null;

    let storePhone = '';
    try {
      const savedSettings = localStorage.getItem('puko_settings');
      if (savedSettings) {
        storePhone = normalizePhone(JSON.parse(savedSettings)?.phone);
      }
    } catch {
      // ignore
    }

    // Check admin first if matches store phone or admin user phone
    const adminUser = users.find(
      (u) =>
        u.role === 'ADMIN' &&
        (normalizePhone(u.phone) === targetPhone || (storePhone && storePhone === targetPhone))
    );
    if (adminUser) return adminUser;

    return users.find((u) => normalizePhone(u.phone) === targetPhone) || null;
  };

  /**
   * Reset user password/pin using their verified phone number
   */
  const resetPasswordWithPhone = (phone, newPin) => {
    const target = findUserByPhone(phone);
    if (!target) {
      return {
        success: false,
        message: 'Nomor telepon tidak ditemukan pada akun mana pun. Pastikan nomor sesuai dengan yang terdaftar.',
      };
    }

    const cleanPin = String(newPin || '').trim();
    if (!cleanPin) {
      return {
        success: false,
        message: 'Password baru wajib diisi.',
      };
    }

    let updatedUser = null;
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id === target.id) {
          updatedUser = { ...item, pin: cleanPin };
          return updatedUser;
        }
        return item;
      })
    );

    if (user && user.id === target.id) {
      setUser((prev) => ({ ...prev, pin: cleanPin }));
    }

    return {
      success: true,
      user: updatedUser || target,
      message: `Password akun ${target.name} (${target.role}) berhasil diperbarui. Silakan login.`,
    };
  };

  /**
   * One-click Quick Login (Admin or Kasir) for fast testing and touchscreens
   */
  const quickLogin = (roleTarget) => {
    const target = users.find((u) => u.role === roleTarget);
    if (target) {
      setUser(target);
      return target;
    }
    return null;
  };

  /**
   * Add a new cashier account (Only Cashiers can be created by Owner)
   */
  const addUser = ({ name, username, pin, phone = '' }) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername) throw new Error('Username kasir wajib diisi');
    if (!name || !name.trim()) throw new Error('Nama kasir wajib diisi');
    if (!pin || !pin.trim()) throw new Error('PIN / Sandi kasir wajib diisi');

    const exists = users.some((u) => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan. Silakan gunakan username lain.`);
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      pin: pin.trim(),
      name: name.trim(),
      phone: (phone || '').trim(),
      role: 'KASIR',
      avatar: '🥑',
      roleLabel: 'Kasir Outlet',
      roleBadgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    };

    setUsers((prev) => [...prev, newUser]);

    // Simpan ke Supabase di background
    try {
      supabase.from('users').insert([
        {
          id: newUser.id,
          username: newUser.username,
          pin: newUser.pin,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
          avatar: newUser.avatar,
        },
      ]).then(({ error }) => {
        if (error) console.warn('[AuthContext] addUser error di Supabase:', error);
      });
    } catch (err) {
      console.warn('[AuthContext] addUser error:', err);
    }

    return newUser;
  };

  /**
   * Update cashier / user detail (name, username, pin, phone)
   */
  const updateUser = (id, data) => {
    const cleanUsername = data.username ? data.username.trim().toLowerCase() : undefined;

    if (cleanUsername) {
      const duplicate = users.some(
        (u) => u.id !== id && u.username.toLowerCase() === cleanUsername
      );
      if (duplicate) {
        throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
      }
    }

    let updated = null;
    setUsers((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updated = {
            ...item,
            name: data.name ? data.name.trim() : item.name,
            username: cleanUsername || item.username,
            pin: data.pin !== undefined ? String(data.pin).trim() : item.pin,
            phone: data.phone !== undefined ? String(data.phone).trim() : item.phone,
            email: item.role === 'ADMIN' ? (data.email || item.email || OWNER_EMAIL) : item.email,
          };
          return updated;
        }
        return item;
      })
    );

    // Sync active session if this user is currently logged in
    if (user && user.id === id && updated) {
      setUser(updated);
    }

    // Update di Supabase di background
    if (updated) {
      try {
        supabase
          .from('users')
          .update({
            name: updated.name,
            username: updated.username,
            pin: updated.pin,
            phone: updated.phone,
          })
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.warn('[AuthContext] updateUser error di Supabase:', error);
          });
      } catch (err) {
        console.warn('[AuthContext] updateUser error:', err);
      }
    }

    return updated;
  };

  /**
   * Delete cashier account
   */
  const deleteUser = (id) => {
    const target = users.find((u) => u.id === id);
    if (!target) throw new Error('Akun tidak ditemukan');
    if (target.role === 'ADMIN' || target.id === 'usr-admin') {
      throw new Error('Akun Owner utama tidak dapat dihapus.');
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));

    // Hapus dari Supabase di background
    try {
      supabase.from('users').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('[AuthContext] deleteUser error di Supabase:', error);
      });
    } catch (err) {
      console.warn('[AuthContext] deleteUser error:', err);
    }

    return true;
  };

  /**
   * Reset to initial demo users
   */
  const resetUsers = () => {
    setUsers(DEFAULT_USERS);
    return DEFAULT_USERS;
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    setUser(null);
  };

  const value = {
    user,
    users,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    isKasir: user?.role === 'KASIR',
    ownerEmail: OWNER_EMAIL,
    login,
    signUpWithEmail,
    verifyEmailOtp,
    resendOtp,
    quickLogin,
    findUserByPhone,
    resetPasswordWithPhone,
    normalizePhone,
    addUser,
    updateUser,
    deleteUser,
    resetUsers,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

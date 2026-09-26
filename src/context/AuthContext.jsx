import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { storeService, DEFAULT_STORE_ID, DEMO_STORE_ID } from '../services/storeService';
import { demoService } from '../services/demoService';

const STORAGE_KEY = 'puko_auth_user';
const USERS_STORAGE_KEY = 'puko_users_list';

export const OWNER_EMAIL = 'alpukatkocokpuko@gmail.com';

export const DEMO_USER = {
  id: 'usr-demo',
  storeId: DEMO_STORE_ID,
  store_id: DEMO_STORE_ID,
  username: 'demo',
  email: 'demo@puko.id',
  pin: '1234',
  name: 'Tamu Demo',
  role: 'ADMIN',
  phone: '085652103647',
  avatar: '🥑',
  roleLabel: 'Mode Demo (Akses Penuh)',
  roleBadgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  isDemo: true,
};

export const DEFAULT_USERS = [
  {
    id: 'usr-admin',
    storeId: DEFAULT_STORE_ID,
    store_id: DEFAULT_STORE_ID,
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
    storeId: DEFAULT_STORE_ID,
    store_id: DEFAULT_STORE_ID,
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
  // List of all accounts (Admin & Cashiers across stores)
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
            if (!updated.storeId && !updated.store_id) {
              updated = { ...updated, storeId: DEFAULT_STORE_ID, store_id: DEFAULT_STORE_ID };
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
        if (!parsed?.storeId && !parsed?.store_id) {
          parsed = { ...parsed, storeId: DEFAULT_STORE_ID, store_id: DEFAULT_STORE_ID };
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
          const mapped = data.map((u) => {
            let email = u.email || (u.id === 'usr-admin' ? OWNER_EMAIL : '');
            let avatar = u.avatar || '🥑';
            if (u.avatar && u.avatar.includes('|email:')) {
              const parts = u.avatar.split('|email:');
              avatar = parts[0] || '🥑';
              email = parts[1] || email;
            }
            const sId = u.store_id || (u.id === 'usr-admin' || email === OWNER_EMAIL ? DEFAULT_STORE_ID : DEFAULT_STORE_ID);
            return {
              id: u.id,
              store_id: sId,
              storeId: sId,
              username: u.username,
              email: email,
              pin: u.pin,
              name: u.name,
              role: u.role || 'KASIR',
              phone: u.phone || '',
              avatar: avatar,
              roleLabel: u.role === 'ADMIN' ? 'Admin / Owner' : 'Kasir Outlet',
              roleBadgeColor:
                u.role === 'ADMIN'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                  : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
            };
          });
          setUsers(mapped);
        }
      });
  }, []);

  // Helper to sync and set active user from Supabase session
  const syncSessionUser = async (authUser) => {
    if (!authUser) {
      setUser(null);
      return;
    }

    const matched = users.find(
      (u) =>
        u.id === authUser.id ||
        (u.email && u.email.toLowerCase() === authUser.email?.toLowerCase())
    );

    const isPrimaryOwner =
      authUser.id === 'usr-admin' ||
      authUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

    let storeId = DEFAULT_STORE_ID;
    if (!isPrimaryOwner) {
      const store = await storeService.getOrCreateStoreForOwner(
        authUser.id,
        authUser.email,
        authUser.user_metadata?.name || matched?.name
      );
      storeId = store.id;
    }
    storeService.setActiveStoreId(storeId);

    const resolvedName =
      authUser.user_metadata?.name ||
      matched?.name ||
      (isPrimaryOwner ? 'Owner' : authUser.email?.split('@')[0] || 'Pengguna');

    const activeUser = {
      id: authUser.id,
      email: authUser.email,
      name: resolvedName,
      role: authUser.user_metadata?.role || matched?.role || 'ADMIN',
      username: matched?.username || authUser.email?.split('@')[0],
      phone: matched?.phone || authUser.user_metadata?.phone || '',
      avatar: matched?.avatar || '🥑',
      storeId: storeId,
      store_id: storeId,
      roleLabel: 'Admin / Owner',
      roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    };
    setUser(activeUser);

    // Ensure the active user exists in users state
    setUsers((prev) => {
      const exists = prev.some(
        (u) =>
          u.id === authUser.id ||
          (u.email && u.email.toLowerCase() === authUser.email?.toLowerCase())
      );
      if (exists) {
        return prev.map((u) => {
          if (
            u.id === authUser.id ||
            (u.email && u.email.toLowerCase() === authUser.email?.toLowerCase())
          ) {
            return { ...u, name: resolvedName, email: authUser.email, storeId, store_id: storeId };
          }
          return u;
        });
      }
      return [
        ...prev,
        {
          id: authUser.id,
          storeId: storeId,
          store_id: storeId,
          username: activeUser.username,
          email: authUser.email,
          pin: '1234',
          name: activeUser.name,
          role: 'ADMIN',
          phone: activeUser.phone,
          avatar: '🥑',
          roleLabel: 'Admin / Owner',
          roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
        },
      ];
    });
  };

  // Listen to Supabase Auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSessionUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        syncSessionUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        storeService.setActiveStoreId(DEFAULT_STORE_ID);
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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
   * Multi-tenant aware: Automatically sets the active store for the authenticated user
   */
  const login = async (identifier, secret) => {
    const trimmedId = (identifier || '').trim();
    const normalizedIdPhone = normalizePhone(trimmedId);
    const trimmedSecret = (secret || '').trim();

    if (!trimmedId) {
      return { success: false, message: 'Email, Nama, Username, atau Nomor Telepon wajib diisi.' };
    }
    if (!trimmedSecret) {
      return { success: false, message: 'Password / sandi wajib diisi.' };
    }

    const isEmail = trimmedId.includes('@');

    // 1. If it's an email, attempt Supabase Auth first (for Owner)
    if (isEmail) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedId.toLowerCase(),
          password: trimmedSecret,
        });

        if (!error && data.user) {
          const matched = users.find(
            (u) =>
              u.id === data.user.id ||
              u.email?.toLowerCase() === data.user.email?.toLowerCase()
          );

          const isPrimaryOwner =
            data.user.id === 'usr-admin' ||
            data.user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

          let storeId = DEFAULT_STORE_ID;
          if (!isPrimaryOwner) {
            const store = await storeService.getOrCreateStoreForOwner(
              data.user.id,
              data.user.email,
              data.user.user_metadata?.name || matched?.name
            );
            storeId = store.id;
          }
          storeService.setActiveStoreId(storeId);

          const resolvedName =
            data.user.user_metadata?.name ||
            matched?.name ||
            (isPrimaryOwner ? 'Owner' : data.user.email?.split('@')[0] || 'Pengguna');

          const activeUser = {
            id: data.user.id,
            email: data.user.email,
            name: resolvedName,
            role: data.user.user_metadata?.role || matched?.role || 'ADMIN',
            username: matched?.username || data.user.email?.split('@')[0],
            phone: matched?.phone || data.user.user_metadata?.phone || '',
            avatar: matched?.avatar || '🥑',
            storeId: storeId,
            store_id: storeId,
            roleLabel: 'Admin / Owner',
            roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
          };
          setUser(activeUser);

          setUsers((prev) => {
            const exists = prev.some(
              (u) =>
                u.id === data.user.id ||
                (u.email && u.email.toLowerCase() === data.user.email?.toLowerCase())
            );
            if (exists) {
              return prev.map((u) => {
                if (
                  u.id === data.user.id ||
                  (u.email && u.email.toLowerCase() === data.user.email?.toLowerCase())
                ) {
                  return { ...u, name: resolvedName, email: data.user.email, storeId, store_id: storeId };
                }
                return u;
              });
            }
            return [
              ...prev,
              {
                id: data.user.id,
                storeId: storeId,
                store_id: storeId,
                username: activeUser.username,
                email: data.user.email,
                pin: trimmedSecret.slice(0, 6) || '1234',
                name: activeUser.name,
                role: 'ADMIN',
                phone: activeUser.phone,
                avatar: '🥑',
                roleLabel: 'Admin / Owner',
                roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
              },
            ];
          });

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

    // 2. Check local/database users list (Supports Name, Username, Phone, and Email for both Admin and Kasir)
    // Selalu ambil data terbaru dari Supabase agar perubahan sandi/nama di satu perangkat (misal laptop) langsung sinkron di perangkat lain (misal HP)
    let currentUsers = users;
    try {
      const { data: dbUsers, error: dbError } = await supabase.from('users').select('*');
      if (!dbError && Array.isArray(dbUsers) && dbUsers.length > 0) {
        const mapped = dbUsers.map((u) => {
          let email = u.email || (u.id === 'usr-admin' ? OWNER_EMAIL : '');
          let avatar = u.avatar || '🥑';
          if (u.avatar && u.avatar.includes('|email:')) {
            const parts = u.avatar.split('|email:');
            avatar = parts[0] || '🥑';
            email = parts[1] || email;
          }
          const sId = u.store_id || DEFAULT_STORE_ID;
          return {
            id: u.id,
            store_id: sId,
            storeId: sId,
            username: u.username,
            email: email,
            pin: String(u.pin || ''),
            name: u.name,
            role: u.role || 'KASIR',
            phone: u.phone || '',
            avatar: avatar,
            roleLabel: u.role === 'ADMIN' ? 'Admin / Owner' : 'Kasir Outlet',
            roleBadgeColor:
              u.role === 'ADMIN'
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
          };
        });
        currentUsers = mapped;
        setUsers(mapped);
        try {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mapped));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi data user dari Supabase saat login:', err);
    }

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
      const uName = (u.name || '').toLowerCase();

      const phoneMatched =
        Boolean(normalizedIdPhone) &&
        (uPhone === normalizedIdPhone || (u.role === 'ADMIN' && storePhone === normalizedIdPhone));

      const idMatched =
        uUsername === trimmedId.toLowerCase() ||
        uName === trimmedId.toLowerCase() ||
        (uEmail && uEmail === trimmedId.toLowerCase()) ||
        phoneMatched;

      return idMatched;
    };

    const found = currentUsers.find(isMatch);

    if (found) {
      const userStoreId = found.storeId || found.store_id || (found.id === 'usr-admin' || (found.role === 'ADMIN' && found.email === OWNER_EMAIL) ? DEFAULT_STORE_ID : DEFAULT_STORE_ID);
      storeService.setActiveStoreId(userStoreId);

      // If it's ADMIN:
      if (found.role === 'ADMIN') {
        // Try authenticating with Supabase Auth using Owner's email
        try {
          const authAttempt = await supabase.auth.signInWithPassword({
            email: found.email || OWNER_EMAIL,
            password: trimmedSecret,
          });
          if (!authAttempt.error && authAttempt.data.user) {
            let storeId = userStoreId;
            if (found.email && found.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
              const store = await storeService.getOrCreateStoreForOwner(
                authAttempt.data.user.id,
                authAttempt.data.user.email,
                found.name
              );
              storeId = store.id;
            }
            storeService.setActiveStoreId(storeId);

            const activeUser = {
              id: authAttempt.data.user.id,
              email: authAttempt.data.user.email,
              name: found.name || 'Owner',
              role: 'ADMIN',
              username: found.username || 'admin',
              phone: found.phone || '',
              avatar: '🥑',
              storeId: storeId,
              store_id: storeId,
              roleLabel: 'Admin / Owner',
              roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
            };
            setUser(activeUser);
            return { success: true, user: activeUser };
          }
        } catch (e) {
          // ignore fallback
        }

        // Check fallback PIN/password
        if (found.pin === trimmedSecret) {
          const activeUser = { ...found, storeId: userStoreId, store_id: userStoreId };
          setUser(activeUser);
          return { success: true, user: activeUser };
        }

        return {
          success: false,
          message: 'Password akun Owner salah. Periksa kembali password Anda.',
        };
      }

      // If it's KASIR:
      if (found.pin === trimmedSecret) {
        const activeUser = { ...found, storeId: userStoreId, store_id: userStoreId };
        setUser(activeUser);
        return { success: true, user: activeUser };
      }

      return {
        success: false,
        message: 'PIN / Sandi Kasir salah. Periksa kembali sandi Anda.',
      };
    }

    return {
      success: false,
      message: 'Akun tidak ditemukan. Periksa kembali Email, Nama, Username, atau Nomor Telepon Anda.',
    };
  };

  /**
   * Register a new Owner account via Supabase Auth
   * Multi-tenant: Creates a dedicated store for the new owner!
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

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: {
          name: cleanName,
          role: 'ADMIN',
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Email ini sudah terdaftar. Silakan langsung masuk menggunakan email & kata sandi Anda.');
      }
      if (
        error.message.toLowerCase().includes('confirmation email') ||
        error.message.toLowerCase().includes('sending confirmation') ||
        error.message.toLowerCase().includes('rate limit')
      ) {
        throw new Error(
          'Server Supabase gagal mengirim email OTP (terkena batas/limit 3 email/jam dari Supabase). Solusi: Silakan buka tab Supabase Anda > Authentication > Providers > Email, lalu matikan toggle "Confirm email" agar pendaftaran akun bisa langsung aktif tanpa perlu kode OTP.'
        );
      }
      throw error;
    }

    // Check if user is already registered in Supabase
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const loginAttempt = await login(cleanEmail, cleanPassword);
      if (loginAttempt.success) {
        return { success: true, needsConfirmation: false, user: loginAttempt.user };
      }

      if (loginAttempt.code === 'EMAIL_NOT_CONFIRMED') {
        await supabase.auth.resend({ type: 'signup', email: cleanEmail });
        return {
          success: true,
          needsConfirmation: true,
          email: cleanEmail,
          user: data.user,
        };
      }

      throw new Error(
        'Email ini sudah terdaftar dan terkonfirmasi di PUKO POS. Silakan langsung masuk melalui form "Masuk Akun" dengan email dan kata sandi Anda.'
      );
    }

    // Save pending email in sessionStorage for VerifyEmail page
    try {
      sessionStorage.setItem('puko_verify_email', cleanEmail);
    } catch {
      // ignore
    }

    // If session was created immediately (email confirmation disabled in Supabase)
    if (data.session) {
      const newStore = await storeService.createStoreForOwner(data.user.id, cleanEmail, cleanName);
      const storeId = newStore.id;
      storeService.setActiveStoreId(storeId);

      const activeUser = {
        id: data.user.id,
        email: data.user.email,
        name: cleanName,
        role: 'ADMIN',
        username: cleanEmail.split('@')[0],
        avatar: '🥑',
        storeId: storeId,
        store_id: storeId,
        roleLabel: 'Admin / Owner',
        roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
      };
      setUser(activeUser);

      setUsers((prev) => {
        const filtered = prev.filter(
          (u) => u.id !== data.user.id && u.email?.toLowerCase() !== cleanEmail
        );
        return [
          ...filtered,
          {
            id: data.user.id,
            storeId: storeId,
            store_id: storeId,
            username: cleanEmail.split('@')[0],
            name: cleanName,
            email: cleanEmail,
            role: 'ADMIN',
            pin: cleanPassword.slice(0, 6) || '1234',
            phone: '',
            avatar: '🥑',
            roleLabel: 'Admin / Owner',
            roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
          },
        ];
      });

      try {
        supabase
          .from('users')
          .upsert({
            id: data.user.id,
            store_id: storeId,
            username: cleanEmail.split('@')[0],
            name: cleanName,
            role: 'ADMIN',
            avatar: `🥑|email:${cleanEmail}`,
            pin: cleanPassword.slice(0, 6) || '1234',
          })
          .then(({ error: upsertErr }) => {
            if (upsertErr && upsertErr.message?.includes('store_id')) {
              supabase.from('users').upsert({
                id: data.user.id,
                username: cleanEmail.split('@')[0],
                name: cleanName,
                role: 'ADMIN',
                avatar: `🥑|email:${cleanEmail}`,
                pin: cleanPassword.slice(0, 6) || '1234',
              }).then(() => {});
            }
          });
      } catch (e) {
        // ignore
      }

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
   * Verify 6-digit OTP confirmation code from Gmail
   * Automatically initializes the Owner's dedicated store
   */
  const verifyEmailOtp = async (email, token) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (token || '').trim();

    if (!cleanToken) {
      throw new Error('Kode OTP 6 digit wajib diisi.');
    }

    if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      throw new Error('Kode OTP harus terdiri dari 6 digit angka.');
    }

    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    if (error) {
      const retry = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });
      if (retry.error) {
        throw new Error('Kode OTP salah atau sudah kadaluarsa. Pastikan 6 digit kode sesuai dengan yang masuk di Gmail Anda.');
      }
      data = retry.data;
    }

    if (data?.user) {
      const isPrimaryOwner =
        data.user.id === 'usr-admin' ||
        cleanEmail.toLowerCase() === OWNER_EMAIL.toLowerCase();

      let storeId = DEFAULT_STORE_ID;
      if (!isPrimaryOwner) {
        const store = await storeService.getOrCreateStoreForOwner(
          data.user.id,
          cleanEmail,
          data.user.user_metadata?.name || cleanEmail.split('@')[0]
        );
        storeId = store.id;
      }
      storeService.setActiveStoreId(storeId);

      const resolvedName =
        data.user.user_metadata?.name ||
        cleanEmail.split('@')[0] ||
        'Owner';

      const activeUser = {
        id: data.user.id,
        email: data.user.email,
        name: resolvedName,
        role: 'ADMIN',
        username: cleanEmail.split('@')[0],
        avatar: '🥑',
        storeId: storeId,
        store_id: storeId,
        roleLabel: 'Admin / Owner',
        roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
      };
      setUser(activeUser);

      // Add or update in users state
      setUsers((prev) => {
        const filtered = prev.filter(
          (u) => u.id !== data.user.id && u.email?.toLowerCase() !== cleanEmail
        );
        return [
          ...filtered,
          {
            id: data.user.id,
            storeId: storeId,
            store_id: storeId,
            username: cleanEmail.split('@')[0],
            name: resolvedName,
            email: cleanEmail,
            role: 'ADMIN',
            pin: '1234',
            phone: '',
            avatar: '🥑',
            roleLabel: 'Admin / Owner',
            roleBadgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
          },
        ];
      });

      // Remove pending email
      try {
        sessionStorage.removeItem('puko_verify_email');
      } catch {
        // ignore
      }

      // Upsert into public.users table in background
      try {
        supabase
          .from('users')
          .upsert({
            id: data.user.id,
            store_id: storeId,
            username: cleanEmail.split('@')[0],
            name: resolvedName,
            role: 'ADMIN',
            avatar: `🥑|email:${cleanEmail}`,
            pin: '1234',
          })
          .then(({ error: upsertErr }) => {
            if (upsertErr && upsertErr.message?.includes('store_id')) {
              supabase.from('users').upsert({
                id: data.user.id,
                username: cleanEmail.split('@')[0],
                name: resolvedName,
                role: 'ADMIN',
                avatar: `🥑|email:${cleanEmail}`,
                pin: '1234',
              }).then(() => {});
            }
          });
      } catch (e) {
        console.warn('Upsert public.users after verifyOtp:', e);
      }

      return { success: true, user: activeUser };
    }

    throw new Error('Verifikasi gagal. Pastikan kode OTP 6 digit sesuai dengan yang masuk di Gmail.');
  };

  /**
   * Resend 6-digit confirmation code to Gmail
   */
  const resendOtp = async (email) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });
    if (error) {
      if (
        error.message.toLowerCase().includes('confirmation email') ||
        error.message.toLowerCase().includes('sending confirmation') ||
        error.message.toLowerCase().includes('rate limit')
      ) {
        throw new Error(
          'Server Supabase gagal mengirim ulang email (terkena limit 3 email/jam). Solusi: Matikan toggle "Confirm email" di Dashboard Supabase > Authentication > Providers > Email agar akun bisa langsung aktif tanpa OTP.'
        );
      }
      throw new Error(error.message || 'Gagal mengirim ulang kode. Silakan coba lagi sebentar lagi.');
    }
    return true;
  };

  /**
   * Find user by registered phone number
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
   * Cashiers and users belonging specifically to the active store
   */
  const activeStoreId = storeService.getActiveStoreId(user);
  const visibleUsers = users.filter((u) => {
    const uStore =
      u.storeId ||
      u.store_id ||
      (u.id === 'usr-admin' || (u.role === 'ADMIN' && u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase())
        ? DEFAULT_STORE_ID
        : DEFAULT_STORE_ID);
    return uStore === activeStoreId;
  });

  /**
   * One-click Quick Login (Admin or Kasir of current store)
   */
  const quickLogin = (roleTarget) => {
    const target = visibleUsers.find((u) => u.role === roleTarget) || users.find((u) => u.role === roleTarget);
    if (target) {
      const targetStoreId = target.storeId || target.store_id || DEFAULT_STORE_ID;
      storeService.setActiveStoreId(targetStoreId);
      const userWithStore = { ...target, storeId: targetStoreId, store_id: targetStoreId };
      setUser(userWithStore);
      return userWithStore;
    }
    return null;
  };

  /**
   * Add a new cashier account for the CURRENT store
   */
  const addUser = ({ name, username, pin, phone = '', email = '' }) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPin = (pin || '').trim();

    if (!cleanName) throw new Error('Nama kasir wajib diisi');
    if (!cleanPhone) throw new Error('Nomor telepon / WhatsApp kasir wajib diisi (utama untuk login kasir)');
    if (!cleanUsername) throw new Error('Username kasir wajib diisi');
    if (!cleanPin) throw new Error('PIN / Sandi kasir wajib diisi');

    const exists = users.some(
      (u) =>
        u.username?.toLowerCase() === cleanUsername ||
        (cleanPhone && normalizePhone(u.phone) === normalizePhone(cleanPhone)) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
    );
    if (exists) {
      throw new Error(`Username, Nomor Telepon, atau Email sudah terdaftar pada akun lain.`);
    }

    const currentStoreId = storeService.getActiveStoreId(user);
    const newUser = {
      id: `usr-${Date.now()}`,
      store_id: currentStoreId,
      storeId: currentStoreId,
      username: cleanUsername,
      pin: cleanPin,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      role: 'KASIR',
      avatar: '🥑',
      roleLabel: 'Kasir Outlet',
      roleBadgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    };

    setUsers((prev) => [...prev, newUser]);

    // Simpan ke Supabase di background
    try {
      const dbAvatar = cleanEmail ? `🥑|email:${cleanEmail}` : '🥑';
      supabase.from('users').insert([
        {
          id: newUser.id,
          store_id: currentStoreId,
          username: newUser.username,
          pin: newUser.pin,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
          avatar: dbAvatar,
        },
      ]).then(({ error }) => {
        if (error) {
          if (error.message?.includes('store_id')) {
            supabase.from('users').insert([
              {
                id: newUser.id,
                username: newUser.username,
                pin: newUser.pin,
                name: newUser.name,
                role: newUser.role,
                phone: newUser.phone,
                avatar: dbAvatar,
              },
            ]).then(() => {});
          } else {
            console.warn('[AuthContext] addUser error di Supabase:', error);
          }
        }
      });
    } catch (err) {
      console.warn('[AuthContext] addUser error:', err);
    }

    return newUser;
  };

  /**
   * Update cashier / user detail (name, username, pin, phone)
   */
  const updateUser = async (id, data) => {
    const cleanUsername = data.username ? data.username.trim().toLowerCase() : undefined;

    if (cleanUsername) {
      const duplicate = users.some(
        (u) => u.id !== id && u.username?.toLowerCase() === cleanUsername
      );
      if (duplicate) {
        throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
      }
    }

    const isTargetAdmin =
      id === 'usr-admin' ||
      data.role === 'ADMIN' ||
      (user && user.role === 'ADMIN' && (id === user.id || id === 'usr-admin'));

    let updated = null;
    setUsers((prev) =>
      prev.map((item) => {
        const isMatch = item.id === id || (isTargetAdmin && item.role === 'ADMIN');
        if (isMatch) {
          updated = {
            ...item,
            name: data.name ? data.name.trim() : item.name,
            username: cleanUsername || item.username,
            pin: data.pin !== undefined ? String(data.pin).trim() : item.pin,
            phone: data.phone !== undefined ? String(data.phone).trim() : item.phone,
            email: item.role === 'ADMIN'
              ? (data.email || item.email || OWNER_EMAIL)
              : (data.email !== undefined ? data.email.trim().toLowerCase() : item.email),
          };
          return updated;
        }
        return item;
      })
    );

    // 1. Sync active session
    const isCurrentLoggedIn = Boolean(
      user && (user.id === id || (user.role === 'ADMIN' && isTargetAdmin))
    );

    if (isCurrentLoggedIn && updated) {
      const activeUpdate = {
        ...user,
        name: updated.name,
        username: updated.username,
        phone: updated.phone,
        pin: updated.pin,
      };
      setUser(activeUpdate);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUpdate));
      } catch {
        // ignore
      }
    }

    // 2. Jika target adalah Owner/Admin, update juga metadata dan password di Supabase Auth!
    if (isTargetAdmin) {
      try {
        const authUpdates = {
          data: {
            name: data.name ? data.name.trim() : undefined,
            phone: data.phone !== undefined ? String(data.phone).trim() : undefined,
            username: cleanUsername || undefined,
          },
        };

        if (data.pin && String(data.pin).trim().length >= 6) {
          authUpdates.password = String(data.pin).trim();
        }

        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) {
          console.warn('[AuthContext] supabase.auth.updateUser notice:', authError.message);
        }
      } catch (authErr) {
        console.warn('[AuthContext] Supabase auth update error:', authErr);
      }
    }

    // 3. Update di public.users Supabase
    if (updated) {
      try {
        const targetDbId = id;
        const dbAvatar = updated.email && updated.role !== 'ADMIN'
          ? `${updated.avatar || '🥑'}|email:${updated.email}`
          : (updated.avatar || '🥑');

        const { error: dbError } = await supabase
          .from('users')
          .update({
            name: updated.name,
            username: updated.username,
            pin: updated.pin,
            phone: updated.phone,
            avatar: dbAvatar,
          })
          .eq('id', targetDbId);

        if (dbError) {
          console.warn('[AuthContext] updateUser error di Supabase:', dbError);
        }
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
   * Masuk ke Mode Demo Sandbox
   */
  const enterDemoMode = () => {
    storeService.setActiveStoreId(DEMO_STORE_ID);
    demoService.ensureDemoData();
    setUser(DEMO_USER);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
    } catch {
      // ignore
    }
    return DEMO_USER;
  };

  /**
   * Reset data demo ke kondisi awal
   */
  const resetDemo = () => {
    demoService.resetDemoData();
    return true;
  };

  /**
   * Keluar dari mode demo
   */
  const exitDemoMode = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    storeService.setActiveStoreId(DEFAULT_STORE_ID);
    setUser(null);
  };

  /**
   * Logout user
   */
  const logout = async () => {
    if (user?.isDemo) {
      exitDemoMode();
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    storeService.setActiveStoreId(DEFAULT_STORE_ID);
    setUser(null);
  };

  const value = {
    user,
    users: visibleUsers,
    allUsers: users,
    activeStoreId,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    isKasir: user?.role === 'KASIR',
    isDemo: Boolean(user?.isDemo),
    enterDemoMode,
    resetDemo,
    exitDemoMode,
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

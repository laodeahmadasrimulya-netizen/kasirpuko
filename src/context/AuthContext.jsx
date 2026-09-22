import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'puko_auth_user';
const USERS_STORAGE_KEY = 'puko_users_list';

export const DEFAULT_USERS = [
  {
    id: 'usr-admin',
    username: 'admin',
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
            if (updated.id === 'usr-admin') {
              if (updated.name === 'Owner / Supervisor' || !updated.name) {
                updated = { ...updated, name: 'Owner' };
              }
              if (!updated.phone) {
                updated = { ...updated, phone: '085652103647' };
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
        if (parsed?.id === 'usr-admin') {
          if (parsed?.name === 'Owner / Supervisor' || !parsed?.name) {
            parsed = { ...parsed, name: 'Owner' };
          }
          if (!parsed?.phone) {
            parsed = { ...parsed, phone: '085652103647' };
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
   * Login with username OR phone number and PIN / password
   */
  const login = (identifier, secret) => {
    const trimmedId = (identifier || '').trim().toLowerCase();
    const normalizedIdPhone = normalizePhone(identifier);
    const trimmedSecret = (secret || '').trim();

    let storePhone = '';
    try {
      const savedSettings = localStorage.getItem('puko_settings');
      if (savedSettings) {
        storePhone = normalizePhone(JSON.parse(savedSettings)?.phone);
      }
    } catch {
      // ignore
    }

    const isMatch = (u, checkSecret = true) => {
      const uPhone = normalizePhone(u.phone);
      const phoneMatched =
        Boolean(normalizedIdPhone) &&
        (uPhone === normalizedIdPhone || (u.role === 'ADMIN' && storePhone === normalizedIdPhone));
      const userMatched = u.username.toLowerCase() === trimmedId || phoneMatched;

      if (!userMatched) return false;
      if (!checkSecret) return true;
      return u.pin === trimmedSecret || u.username === trimmedSecret;
    };

    const matched = users.find((u) => isMatch(u, true));
    const valid = users.find((u) => isMatch(u, false) && u.pin === trimmedSecret);

    const found = valid || matched;

    if (found) {
      setUser(found);
      return { success: true, user: found };
    }

    return {
      success: false,
      message: 'Username/No. Telepon atau Password tidak sesuai. Periksa kembali data login Anda.',
    };
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
   * Add a new cashier or admin account
   */
  const addUser = ({ name, username, pin, phone = '', role = 'KASIR' }) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername) throw new Error('Username wajib diisi');
    if (!name || !name.trim()) throw new Error('Nama kasir wajib diisi');
    if (!pin || !pin.trim()) throw new Error('PIN / Sandi wajib diisi');

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
      role: role,
      avatar: '🥑',
      roleLabel: role === 'ADMIN' ? 'Admin / Owner' : 'Kasir Outlet',
      roleBadgeColor:
        role === 'ADMIN'
          ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
          : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    };

    setUsers((prev) => [...prev, newUser]);
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

    return updated;
  };

  /**
   * Delete cashier account
   */
  const deleteUser = (id) => {
    const target = users.find((u) => u.id === id);
    if (!target) throw new Error('Akun tidak ditemukan');
    if (target.role === 'ADMIN') {
      const adminCount = users.filter((u) => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        throw new Error('Tidak dapat menghapus satu-satunya akun Admin.');
      }
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
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
  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    users,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    isKasir: user?.role === 'KASIR',
    login,
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

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const { users } = useAuth();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        // Supabase client automatically parses hash tokens (#access_token=...)
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data?.session?.user) {
          if (!isMounted) return;
          setStatus('success');
          playSuccessSound();

          // Sync user to public.users if needed
          const authUser = data.session.user;
          const cleanEmail = authUser.email;
          const name = authUser.user_metadata?.name || 'Owner';

          try {
            await supabase.from('users').upsert({
              id: authUser.id,
              username: cleanEmail.split('@')[0],
              name: name,
              role: 'ADMIN',
              avatar: '🥑',
              pin: '1234',
            });
          } catch (e) {
            console.warn('Upsert user on callback:', e);
          }

          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1200);
        } else {
          // If no session found yet, wait for onAuthStateChange
          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (event === 'SIGNED_IN' && session?.user) {
                if (!isMounted) return;
                setStatus('success');
                playSuccessSound();
                setTimeout(() => {
                  navigate('/dashboard', { replace: true });
                }, 1000);
              }
            }
          );

          // Timeout after 5 seconds if still no session
          setTimeout(() => {
            if (isMounted && status === 'loading') {
              setStatus('error');
              setErrorMessage('Sesi verifikasi tidak ditemukan atau sudah kadaluarsa. Silakan coba masuk kembali.');
            }
          }, 6000);

          return () => {
            authListener?.subscription?.unsubscribe();
          };
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'Gagal memverifikasi link konfirmasi.');
      }
    };

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, users]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-slate-100 to-slate-200 flex flex-col justify-center items-center px-4 py-12">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-8 max-w-md w-full shadow-xl text-center space-y-4">
        {status === 'loading' && (
          <div className="space-y-3 py-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-puko-100 text-puko-600 flex items-center justify-center animate-spin">
              <RefreshCw className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Memverifikasi Akun Anda...
            </h2>
            <p className="text-xs text-slate-500">
              Sedang menghubungkan ke server PUKO POS, mohon tunggu sebentar.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 py-4 animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-emerald-900">
              Email Berhasil Dikonfirmasi!
            </h2>
            <p className="text-xs text-slate-600">
              Akun Owner Anda telah aktif. Mengalihkan Anda langsung ke Dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-2 animate-shake">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-rose-900">
              Verifikasi Gagal
            </h2>
            <p className="text-xs text-slate-600">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="py-2.5 px-6 rounded-xl bg-puko-600 hover:bg-puko-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

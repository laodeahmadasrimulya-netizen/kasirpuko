import React from 'react';

export const BannerCarousel = () => {
  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-soft border border-slate-200/80 bg-gradient-to-r from-emerald-100/40 via-white to-amber-50/40 select-none">
      <div className="w-full relative flex items-center justify-center">
        {/* Ambient Subtle Glow */}
        <img
          src="/banners/banner_combined.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter blur-2xl opacity-20 scale-105 pointer-events-none"
        />

        {/* Unified 1-Piece Aesthetic Brand Banner */}
        <img
          src="/banners/banner_combined.jpg"
          alt="PUKO Alpukat Kocok Banner"
          draggable={false}
          className="relative z-10 w-full h-auto block rounded-2xl sm:rounded-3xl shadow-xs"
        />
      </div>
    </div>
  );
};

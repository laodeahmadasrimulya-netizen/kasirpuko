import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Store,
  Maximize2,
  X,
  Sparkles,
} from 'lucide-react';

const BANNERS = [
  {
    id: 1,
    image: '/banners/banner_1.jpg',
    title: 'Daftar Menu PUKO',
    tagline: 'No Serat, No Pahit • 8 Varian Rasa 17K - 20K',
    badge: 'Menu Spesial',
    bgGradient: 'from-emerald-950 via-[#0d2e18] to-slate-950',
  },
  {
    id: 2,
    image: '/banners/banner_2.jpg',
    title: 'PUKO Alpukat Kocok',
    tagline: 'Dikocok Dulu, Baru Diminum • Brand Resmi',
    badge: 'Original Brand',
    bgGradient: 'from-[#0b1329] via-[#0f1d3d] to-[#080d1a]',
  },
  {
    id: 3,
    image: '/banners/banner_3.jpg',
    title: 'Outlet & Booth PUKO',
    tagline: 'Outlet Kendari • Siap Melayani Pesanan Anda',
    badge: 'Kunjungi Booth',
    bgGradient: 'from-[#143d22] via-[#0d2e18] to-slate-950',
  },
];

export const BannerCarousel = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Touch Swipe Handling for Mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  };

  // Auto-play timer
  useEffect(() => {
    if (isPaused || zoomedImage) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, zoomedImage]);

  const onTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <>
      <div
        className="relative w-full h-56 sm:h-64 md:h-72 lg:h-80 rounded-3xl overflow-hidden shadow-soft border border-slate-200/80 select-none group bg-slate-950"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Slides Track */}
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className={`min-w-full h-full relative flex items-center justify-center bg-gradient-to-r ${banner.bgGradient} overflow-hidden`}
            >
              {/* Ambient Blurred Background for Rich Contrast */}
              <img
                src={banner.image}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover filter blur-2xl opacity-40 scale-125 pointer-events-none"
              />

              {/* Dark subtle overlay for contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 pointer-events-none" />

              {/* Main Crisp Foreground Image */}
              <div className="relative z-10 h-full w-full flex items-center justify-center p-2 sm:p-4">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-2xl cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                  onClick={() => setZoomedImage(banner.image)}
                  title="Klik untuk memperbesar gambar"
                />
              </div>

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 max-w-[70%] sm:max-w-md pointer-events-none">
                <div className="inline-flex items-center gap-1.5 bg-puko-600/90 text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full mb-1 backdrop-blur-md shadow-xs">
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  <span>{banner.badge}</span>
                </div>
                <h3 className="text-white text-sm sm:text-lg font-extrabold tracking-tight drop-shadow-md line-clamp-1">
                  {banner.title}
                </h3>
                <p className="text-white/80 text-[11px] sm:text-xs line-clamp-1 drop-shadow-sm hidden xs:block">
                  {banner.tagline}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Top-Right Badges & Controls: Counter & Zoom */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          <div className="bg-black/50 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-xs">
            {currentIndex + 1} / {BANNERS.length}
          </div>

          <button
            type="button"
            onClick={() => setZoomedImage(BANNERS[currentIndex].image)}
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-xs"
            title="Perbesar Foto"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Shortcut Button to Cashier POS (Bottom Right) */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30">
          <button
            type="button"
            onClick={() => navigate('/kasir')}
            className="flex items-center gap-2 bg-puko-600 hover:bg-puko-500 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-white/15"
          >
            <Store className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline">Buka Kasir Sekarang</span>
            <span className="sm:hidden">Buka Kasir</span>
          </button>
        </div>

        {/* Prev & Next Floating Navigation Buttons */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Slide sebelumnya"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer border border-white/10 shadow-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Slide berikutnya"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer border border-white/10 shadow-md"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Pagination Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
          {BANNERS.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentIndex === index
                  ? 'w-7 h-2 bg-puko-500 shadow-sm'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
              title={`Halaman ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Full-Screen Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={zoomedImage}
              alt="Pratinjau Foto PUKO"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect, useRef } from 'react';

const BANNERS = [
  {
    id: 1,
    image: '/banners/banner_1.jpg',
    alt: 'Daftar Menu PUKO',
    bgGradient: 'from-emerald-950 via-[#0d2e18] to-slate-950',
  },
  {
    id: 2,
    image: '/banners/banner_2.jpg',
    alt: 'Logo PUKO Alpukat Kocok',
    bgGradient: 'from-[#0b1329] via-[#0f1d3d] to-[#080d1a]',
  },
  {
    id: 3,
    image: '/banners/banner_3.jpg',
    alt: 'Outlet Booth PUKO',
    bgGradient: 'from-[#143d22] via-[#0d2e18] to-slate-950',
  },
];

export const BannerCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Swipe handling (Touch on mobile & Mouse drag on desktop)
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  };

  // Auto-play timer (5 seconds)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Touch handlers (Mobile)
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

  // Mouse drag handlers (Desktop)
  const onMouseDown = (e) => {
    isDragging.current = true;
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
  };

  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    touchEndX.current = e.clientX;
  };

  const onMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
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
    <div
      className="relative w-full h-56 sm:h-64 md:h-72 lg:h-80 rounded-3xl overflow-hidden shadow-soft border border-slate-200/80 select-none group bg-slate-950 cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        isDragging.current = false;
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Slides Track */}
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {BANNERS.map((banner) => (
          <div
            key={banner.id}
            className={`min-w-full h-full relative flex items-center justify-center bg-gradient-to-r ${banner.bgGradient} overflow-hidden`}
          >
            {/* Ambient Blurred Backdrop for Rich Atmosphere */}
            <img
              src={banner.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover filter blur-2xl opacity-40 scale-125 pointer-events-none"
            />

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

            {/* Main Pure Clean Image */}
            <div className="relative z-10 h-full w-full flex items-center justify-center p-2 sm:p-4">
              <img
                src={banner.image}
                alt={banner.alt}
                draggable={false}
                className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-2xl pointer-events-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Pagination Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-auto">
        {BANNERS.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
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
  );
};

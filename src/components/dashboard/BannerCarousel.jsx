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

// Extended slides with seamless clones for continuous 1-direction infinite loop
// [Clone of Last, Slide 1, Slide 2, Slide 3, Clone of First]
const EXTENDED_BANNERS = [
  { ...BANNERS[BANNERS.length - 1], cloneKey: 'clone-last' },
  ...BANNERS,
  { ...BANNERS[0], cloneKey: 'clone-first' },
];

export const BannerCarousel = () => {
  // Start at index 1 (the real first banner)
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const isAnimating = useRef(false);

  // Swipe handling (Touch on mobile & Mouse drag on desktop)
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  const handleNext = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  const handleDotClick = (index) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsTransitioning(true);
    setCurrentIndex(index + 1);
  };

  // Seamless jump when reaching clones at the edges
  const handleTransitionEnd = () => {
    if (currentIndex === EXTENDED_BANNERS.length - 1) {
      // Reached Clone of Slide 1 -> Jump back to real Slide 1 without animation
      setIsTransitioning(false);
      setCurrentIndex(1);
    } else if (currentIndex === 0) {
      // Reached Clone of Slide 3 -> Jump back to real Slide 3 without animation
      setIsTransitioning(false);
      setCurrentIndex(BANNERS.length);
    }
    isAnimating.current = false;
  };

  // Auto-play timer: always moves forward in the same direction (searah)
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
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
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
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Calculate current active dot (0, 1, or 2)
  const activeDotIndex =
    currentIndex === 0
      ? BANNERS.length - 1
      : currentIndex === EXTENDED_BANNERS.length - 1
      ? 0
      : currentIndex - 1;

  return (
    <div
      className="relative w-full h-44 sm:h-52 md:h-56 lg:h-64 rounded-2xl sm:rounded-3xl overflow-hidden shadow-soft border border-slate-200/80 select-none group bg-slate-950 cursor-grab active:cursor-grabbing"
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
      {/* Slides Track: Seamless Infinite Loop */}
      <div
        className="flex h-full w-full"
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: isTransitioning ? 'transform 500ms ease-out' : 'none',
        }}
      >
        {EXTENDED_BANNERS.map((banner, idx) => (
          <div
            key={banner.cloneKey || banner.id || idx}
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
            <div className="relative z-10 h-full w-full flex items-center justify-center p-2 sm:p-3">
              <img
                src={banner.image}
                alt={banner.alt}
                draggable={false}
                className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-xl sm:rounded-2xl pointer-events-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Pagination Dots */}
      <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pointer-events-auto">
        {BANNERS.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDotClick(index);
            }}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              activeDotIndex === index
                ? 'w-6 sm:w-7 h-1.5 sm:h-2 bg-puko-500 shadow-sm'
                : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50 hover:bg-white/80'
            }`}
            title={`Halaman ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

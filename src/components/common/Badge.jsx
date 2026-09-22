import React from 'react';

const VARIANTS = {
  brand: 'bg-puko-100 text-puko-800 border-puko-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const Badge = ({
  children,
  variant = 'brand',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border
        ${sizeClasses}
        ${VARIANTS[variant] || VARIANTS.brand}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'danger'
              ? 'bg-rose-500'
              : variant === 'success'
              ? 'bg-emerald-500'
              : 'bg-puko-500'
          }`}
        />
      )}
      {children}
    </span>
  );
};

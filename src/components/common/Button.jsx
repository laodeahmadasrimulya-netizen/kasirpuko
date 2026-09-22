import React from 'react';

const VARIANTS = {
  primary:
    'bg-puko-600 hover:bg-puko-700 text-white shadow-sm active:scale-[0.98] focus:ring-puko-500',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-[0.98] focus:ring-slate-300',
  outline:
    'border border-slate-300 hover:bg-slate-50 text-slate-700 active:scale-[0.98] focus:ring-slate-300',
  danger:
    'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 active:scale-[0.98] focus:ring-rose-400',
  success:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.98] focus:ring-emerald-500',
  ghost:
    'hover:bg-slate-100 text-slate-600 active:scale-[0.98] focus:ring-slate-200',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-base rounded-xl gap-2.5 font-semibold',
  icon: 'p-2 rounded-xl',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-medium transition-all duration-150 select-none
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
};

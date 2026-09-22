import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          type={type}
          className={`
            w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl
            px-3.5 py-2.5 transition-colors duration-150
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-puko-500 focus:border-puko-500 focus:bg-white
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-rose-400 focus:ring-rose-400' : ''}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
};

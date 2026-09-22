import React from 'react';

export const Card = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  padding = true,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-slate-200/80 shadow-soft transition-all duration-200
        ${hoverable ? 'hover:shadow-md hover:border-puko-300 cursor-pointer' : ''}
        ${padding ? 'p-5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

import React from 'react';
import { Card } from './Card';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'puko',
}) => {
  const colorMap = {
    puko: 'bg-puko-50 text-puko-700 border-puko-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    black: 'bg-slate-100 text-slate-900 border-slate-200/80',
    dark: 'bg-slate-100 text-slate-900 border-slate-200/80',
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-800">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="shrink-0 pt-0.5">
            <Icon className="w-6 h-6 text-slate-900" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center text-xs text-slate-600">
          {trend}
        </div>
      )}
    </Card>
  );
};

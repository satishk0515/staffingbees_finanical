/**
 * @file Skeleton.jsx
 * @description Smooth pulsing placeholder loaders designed to match KPI cards,
 * charts, and table geometries while data is being fetched.
 */

import React from 'react';
import clsx from 'clsx';

export function Skeleton({ className = '', ...rest }) {
  return (
    <div
      className={clsx('bg-slate-200/70 animate-pulse rounded-lg', className)}
      {...rest}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[134px]">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="w-24 h-3.5" />
          <Skeleton className="w-32 h-7" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-12 h-3" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 'h-72' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1.5">
          <Skeleton className="w-36 h-4" />
          <Skeleton className="w-48 h-3" />
        </div>
        <Skeleton className="w-20 h-6" />
      </div>
      <Skeleton className={clsx('w-full rounded-lg', height)} />
    </div>
  );
}

export function TableSkeleton({ rows = 4 }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <Skeleton className="w-40 h-4" />
        <Skeleton className="w-16 h-4" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
            <div className="space-y-1">
              <Skeleton className="w-32 h-3.5" />
              <Skeleton className="w-20 h-3" />
            </div>
            <Skeleton className="w-16 h-6 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;

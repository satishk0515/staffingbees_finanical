/**
 * @file EmployeeSummaryStrip.jsx
 * @description Summary count strip displayed above the employee table:
 * Total Employees, Active Workforce, W2 Employees, and 1099 Contractors.
 *
 * Props:
 * @param {Array<Object>} employees - All employee records
 * @param {string} [className=''] - Additional styling
 */

import React, { useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Users, UserCheck, Briefcase, FileCheck } from 'lucide-react';
import clsx from 'clsx';

export function EmployeeSummaryStrip({ employees = [], className = '' }) {
  const counts = useMemo(() => {
    let total = employees.length;
    let active = 0;
    let w2 = 0;
    let contractors = 0;

    employees.forEach((emp) => {
      if (emp.status === 'active') active++;
      if (emp.employmentType === 'W2') w2++;
      if (emp.employmentType === '1099' || emp.employmentType === 'C2C') contractors++;
    });

    return { total, active, w2, contractors };
  }, [employees]);

  const items = [
    {
      label: 'Total Workforce',
      value: counts.total,
      icon: <Users className="w-4 h-4 text-slate-700" />,
      subtext: 'Roster headcount'
    },
    {
      label: 'Active Status',
      value: counts.active,
      icon: <UserCheck className="w-4 h-4 text-emerald-700" />,
      subtext: `${counts.total > 0 ? Math.round((counts.active / counts.total) * 100) : 0}% active rate`
    },
    {
      label: 'W2 Employees',
      value: counts.w2,
      icon: <FileCheck className="w-4 h-4 text-sky-700" />,
      subtext: 'Internal & client W2'
    },
    {
      label: '1099 / Contractors',
      value: counts.contractors,
      icon: <Briefcase className="w-4 h-4 text-indigo-700" />,
      subtext: 'Contractor staff'
    }
  ];

  return (
    <div className={clsx('grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6', className)}>
      {items.map((item, idx) => (
        <Card key={idx} className="p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {item.label}
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
              {item.value}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{item.subtext}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            {item.icon}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default EmployeeSummaryStrip;

/**
 * @file AppLayout.jsx
 * @description Master application frame providing desktop top navbar with
 * grouped dropdown menus for AR (Receivables) and AP (Payables), user
 * profile pill, and toast notification container. Mobile view uses a
 * collapsible drawer with expandable groups.
 *
 * Props:
 * @param {React.ReactNode} children - Page view contents
 *
 * Navigation Structure:
 * - Dashboard, Timesheets, Income (flat links)
 * - Receivables (AR): Invoices, Payments, Aging (dropdown)
 * - Payables (AP): Bills, Payments, Aging (dropdown)
 * - Clients, Jobs, Employees, Placements (flat links)
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Clock,
  FileText,
  DollarSign,
  Receipt,
  Users,
  Building2,
  ClipboardList,
  Briefcase,
  Menu,
  X,
  TrendingUp,
  Wallet,
  ChevronDown,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { ToastContainer } from '../ui/ToastContainer';

/* ── Flat (non-dropdown) navigation items ────────────────────────── */
const FLAT_NAV_BEFORE = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Timesheets', path: '/timesheets', icon: Clock },
  { label: 'Income', path: '/income', icon: TrendingUp },
];

const FLAT_NAV_AFTER = [
  { label: 'Clients', path: '/clients', icon: Building2 },
  { label: 'Jobs', path: '/jobs', icon: ClipboardList },
  { label: 'Employees', path: '/employees', icon: Users },
  { label: 'Placements', path: '/placements', icon: Briefcase },
];

/* ── Grouped dropdown navigation items ───────────────────────────── */
const AR_GROUP = {
  label: 'Receivables',
  icon: ArrowDownRight,
  prefix: '/ar',
  children: [
    { label: 'Invoices', path: '/ar/invoices', icon: FileText },
    { label: 'Payments', path: '/ar/payments', icon: Receipt },
    { label: 'Aging', path: '/ar/aging', icon: DollarSign },
  ],
};

const AP_GROUP = {
  label: 'Payables',
  icon: ArrowUpRight,
  prefix: '/ap',
  children: [
    { label: 'Bills', path: '/ap/bills', icon: Wallet },
    { label: 'Payments', path: '/ap/payments', icon: Receipt },
    { label: 'Aging', path: '/ap/aging', icon: DollarSign },
  ],
};

/* ── Desktop Dropdown Component ──────────────────────────────────── */
function NavDropdown({ group, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);

  const isGroupActive = pathname.startsWith(group.prefix);
  const Icon = group.icon;

  /* close on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMouseEnter = () => {
    clearTimeout(timerRef.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          isGroupActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{group.label}</span>
        <ChevronDown
          className={clsx(
            'w-3 h-3 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={clsx(
          'absolute left-0 top-full mt-1 min-w-[180px] bg-white rounded-xl border border-slate-200 shadow-lg ring-1 ring-slate-900/5 py-1.5 z-50 transition-all origin-top',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        {group.children.map((child) => {
          const ChildIcon = child.icon;
          const isActive = pathname.startsWith(child.path);
          return (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={() => setOpen(false)}
              className={clsx(
                'flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <ChildIcon className="w-3.5 h-3.5" />
              <span>{child.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

/* ── Mobile Collapsible Group ────────────────────────────────────── */
function MobileNavGroup({ group, pathname, onNavigate }) {
  const [expanded, setExpanded] = useState(pathname.startsWith(group.prefix));
  const Icon = group.icon;
  const isGroupActive = pathname.startsWith(group.prefix);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={clsx(
          'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isGroupActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-700 hover:bg-slate-100'
        )}
      >
        <span className="flex items-center gap-2.5">
          <Icon className="w-4 h-4" />
          {group.label}
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3">
          {group.children.map((child) => {
            const ChildIcon = child.icon;
            const isActive = pathname.startsWith(child.path);
            return (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={onNavigate}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <ChildIcon className="w-3.5 h-3.5" />
                <span>{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Helper: flat NavLink (desktop) ──────────────────────────────── */
function FlatNavLink({ item, pathname }) {
  const Icon = item.icon;
  const isActive =
    item.path === '/'
      ? pathname === '/'
      : pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
        isActive
          ? 'bg-slate-900 text-white'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{item.label}</span>
    </NavLink>
  );
}

/* ── Helper: flat NavLink (mobile) ───────────────────────────────── */
function MobileFlatNavLink({ item, pathname, onNavigate }) {
  const Icon = item.icon;
  const isActive =
    item.path === '/'
      ? pathname === '/'
      : pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-slate-900 text-white'
          : 'text-slate-700 hover:bg-slate-100'
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{item.label}</span>
    </NavLink>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  AppLayout                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
export function AppLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-slate-200">
      <ToastContainer />

      {/* ── Primary Top Header ────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand / Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <NavLink to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-slate-800 transition-colors">
                  SF
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                    Staffing
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                      Financials
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 block -mt-0.5">
                    Timesheet & AP/AR Management
                  </span>
                </div>
              </NavLink>
            </div>

            {/* ── Desktop Navigation ──────────────────────────── */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {/* Flat links before dropdowns */}
              {FLAT_NAV_BEFORE.map((item) => (
                <FlatNavLink key={item.path} item={item} pathname={location.pathname} />
              ))}

              {/* AR Dropdown */}
              <NavDropdown group={AR_GROUP} pathname={location.pathname} />

              {/* AP Dropdown */}
              <NavDropdown group={AP_GROUP} pathname={location.pathname} />

              {/* Flat links after dropdowns */}
              {FLAT_NAV_AFTER.map((item) => (
                <FlatNavLink key={item.path} item={item} pathname={location.pathname} />
              ))}
            </nav>

            {/* ── Right User Bar ──────────────────────────────── */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-700">
                  FC
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-none">Financial Ops</div>
                  <div className="text-[10px] text-slate-500">Controller</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile Navigation Drawer ────────────────────────── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 max-h-[70vh] overflow-y-auto">
            {/* Flat links before */}
            {FLAT_NAV_BEFORE.map((item) => (
              <MobileFlatNavLink key={item.path} item={item} pathname={location.pathname} onNavigate={closeMobile} />
            ))}

            {/* AR Group */}
            <MobileNavGroup group={AR_GROUP} pathname={location.pathname} onNavigate={closeMobile} />

            {/* AP Group */}
            <MobileNavGroup group={AP_GROUP} pathname={location.pathname} onNavigate={closeMobile} />

            {/* Flat links after */}
            {FLAT_NAV_AFTER.map((item) => (
              <MobileFlatNavLink key={item.path} item={item} pathname={location.pathname} onNavigate={closeMobile} />
            ))}
          </div>
        )}
      </header>

      {/* ── Main Content Area ─────────────────────────────────── */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* ── Subtle Footer ─────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>Staffing Financial & Timesheet Management System &copy; 2026</span>
          <span>Enterprise Financial Engine &bull; Redux Toolkit State Architecture</span>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;

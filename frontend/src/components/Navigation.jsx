import React from 'react';
import { useTheme } from '../context/ThemeContext';

const Navigation = ({ user, onLogout }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 shadow-md shadow-amber-500/20 text-slate-950 font-black text-base">
              ⚡
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-950"></span>
              </span>
            </div>

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  CryptoPulse
                </h1>
                <span className="hidden sm:inline-block rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase border border-amber-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Institutional Real-Time Markets
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
              className="group relative inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-amber-400 dark:hover:bg-slate-800 dark:hover:text-amber-300 transition-all shadow-xs"
            >
              {isDark ? (
                <svg className="h-4.5 w-4.5 transition-transform group-hover:rotate-45" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-4.5 w-4.5 transition-transform group-hover:-rotate-12" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/60 shadow-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-32 truncate text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {user?.username || 'Trader'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {user?.email ? user.email.split('@')[0] : 'verified'}
                </p>
              </div>
            </div>

            {/* Logout Action */}
            <button
              onClick={onLogout}
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-rose-400 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-500/60 dark:hover:text-rose-400 transition-colors shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

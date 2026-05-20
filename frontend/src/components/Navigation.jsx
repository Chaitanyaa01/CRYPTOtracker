import React from 'react';

const Navigation = ({ user, onLogout }) => {
  return (
    <nav className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400 text-sm font-black text-black">
              CD
            </span>
            <div className="min-w-0 text-left">
              <h1 className="truncate text-lg font-bold tracking-tight text-white">Crypto Dashboard</h1>
              <p className="text-xs text-gray-500">Live markets and alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="max-w-40 truncate text-sm font-medium text-white">{user.username}</p>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-rose-500/60 hover:text-rose-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

import React from 'react';

const Navigation = ({ user, onLogout }) => {
  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              ◈
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Crypto Dashboard</h1>
              <p className="text-xs text-gray-500">Live market overview</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">
              Welcome, <span className="text-white font-medium">{user.username}</span>
            </span>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
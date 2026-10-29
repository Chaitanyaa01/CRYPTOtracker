import React, { useState } from 'react';
import axios from 'axios';
import { apiEndpoint } from '../smallapi';

const Signup = ({ onSignup, switchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...signupData } = formData;
      const response = await axios.post(`${apiEndpoint}/api/auth/register`, signupData);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onSignup(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080a0f] text-slate-900 dark:text-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8 border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-950/80 p-8 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/40">
        <div className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black shadow-lg shadow-amber-500/25 font-black text-sm">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <span className="font-mono text-2xl font-extrabold tracking-tight">CryptoPulse</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create your account</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={switchToLogin}
              className="font-semibold text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Sign in here
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-4 text-left" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2.5 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 dark:border-gray-700 dark:placeholder-gray-500 dark:text-white dark:bg-gray-900 transition-colors"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-2.5 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 dark:border-gray-700 dark:placeholder-gray-500 dark:text-white dark:bg-gray-900 transition-colors"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2.5 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 dark:border-gray-700 dark:placeholder-gray-500 dark:text-white dark:bg-gray-900 transition-colors"
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2.5 border border-slate-300 bg-slate-50 text-slate-900 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 dark:border-gray-700 dark:placeholder-gray-500 dark:text-white dark:bg-gray-900 transition-colors"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/70 dark:border-rose-700/60 dark:text-rose-100 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-lg text-black bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
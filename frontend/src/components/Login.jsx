import React, { useCallback, useState } from 'react';
import axios from 'axios';
import { signInWithPopup } from 'firebase/auth';
import { apiEndpoint } from '../smallapi';
import { firebaseAuth, googleProvider } from '../firebase';

const Login = ({ onLogin, switchToSignup }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const finishFirebaseLogin = useCallback(async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken();
    const response = await axios.post(`${apiEndpoint}/api/auth/firebase`, { idToken });

    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
    }
  }, [onLogin]);

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

    try {
      const response = await axios.post(`${apiEndpoint}/api/auth/login`, formData);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setGoogleLoading(true);

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      await finishFirebaseLogin(result.user);
    } catch (err) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080a0f] text-slate-900 dark:text-white flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="text-left">
          <div className="flex items-center gap-3 mb-5">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-black shadow-lg shadow-amber-500/25 font-black text-sm">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-extrabold tracking-tight">CryptoPulse</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                PRO TERMINAL
              </span>
            </div>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-500 dark:text-amber-400">
            Real-Time Market Intelligence
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl text-slate-900 dark:text-white">
            Institutional-grade crypto analytics.
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-600 dark:text-gray-400">
            Sub-second Binance WebSocket ticking, TradingView Lightweight Charts, and instant email dispatch when your price targets trigger.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
            {['Live WebSockets', 'TradingView Charts', 'Email Alerts'].map((item) => (
              <div
                key={item}
                className="border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900/70 px-3 py-3 text-center rounded-xl shadow-sm dark:shadow-none"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-950/80 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/40 transition-colors">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Need an account?{' '}
              <button
                type="button"
                onClick={switchToSignup}
                className="font-semibold text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Create one
              </button>
            </p>
          </div>

          <form className="mt-6 space-y-4 text-left" onSubmit={handleSubmit}>
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
                placeholder="you@example.com"
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
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-lg text-black bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={googleLogin}
              disabled={googleLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {googleLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </form>

          {error && (
            <div className="mt-5 bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/70 dark:border-rose-700/60 dark:text-rose-100 px-4 py-3 rounded-lg text-sm text-left">
              {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Login;

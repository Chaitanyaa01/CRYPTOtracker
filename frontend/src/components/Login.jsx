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
    <div className="min-h-screen bg-[#080a0f] text-white flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Crypto command center</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Track markets, set alerts, and move faster.
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-400">
            Sign in with your password or Google account.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
            {['50+ coins', 'Live sync', 'Price alerts'].map((item) => (
              <div key={item} className="border border-gray-800 bg-gray-900/70 px-3 py-3 text-center rounded-lg">
                <span className="text-sm font-medium text-gray-200">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-gray-800 bg-gray-950/80 rounded-xl p-6 shadow-2xl shadow-black/40">
          <div className="text-left">
            <h2 className="text-2xl font-bold text-white">Sign in</h2>
            <p className="mt-1 text-sm text-gray-400">
              Need an account?{' '}
              <button onClick={switchToSignup} className="font-medium text-amber-400 hover:text-amber-300">
                Create one
              </button>
            </p>
          </div>

          <form className="mt-6 space-y-4 text-left" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2.5 border border-gray-700 placeholder-gray-500 text-white bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2.5 border border-gray-700 placeholder-gray-500 text-white bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-lg text-black bg-amber-400 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={googleLogin}
              disabled={googleLoading}
              className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-lg text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </form>

          {error && (
            <div className="mt-5 bg-rose-950/70 border border-rose-700/60 text-rose-100 px-4 py-3 rounded-lg text-sm text-left">
              {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Login;

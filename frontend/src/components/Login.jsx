import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from 'firebase/auth';
import { apiEndpoint } from '../smallapi';
import { firebaseAuth, isFirebaseConfigured } from '../firebase';

const FIREBASE_EMAIL_KEY = 'firebase_email_otp_address';

const Login = ({ onLogin, switchToSignup }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finishFirebaseLogin = useCallback(async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken();
    const response = await axios.post(`${apiEndpoint}/api/auth/firebase`, { idToken });

    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.removeItem(FIREBASE_EMAIL_KEY);
      onLogin(response.data.user);
    }
  }, [onLogin]);

  useEffect(() => {
    const completeEmailLink = async () => {
      if (!isFirebaseConfigured || !isSignInWithEmailLink(firebaseAuth, window.location.href)) return;

      const savedEmail = localStorage.getItem(FIREBASE_EMAIL_KEY);
      if (!savedEmail) {
        setOtpMessage('Enter your email below to finish the one-time link sign in.');
        return;
      }

      setOtpLoading(true);
      setError('');

      try {
        const result = await signInWithEmailLink(firebaseAuth, savedEmail, window.location.href);
        await finishFirebaseLogin(result.user);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Could not complete Firebase email sign in');
      } finally {
        setOtpLoading(false);
      }
    };

    completeEmailLink();
  }, [finishFirebaseLogin]);

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

  const sendFirebaseOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpMessage('');

    if (!isFirebaseConfigured) {
      setError('Firebase is not configured. Add the REACT_APP_FIREBASE_* values to frontend/.env.');
      return;
    }

    if (!otpEmail) {
      setError('Enter your email address first');
      return;
    }

    setOtpLoading(true);

    try {
      await sendSignInLinkToEmail(firebaseAuth, otpEmail, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      });
      localStorage.setItem(FIREBASE_EMAIL_KEY, otpEmail);
      setOtpSent(true);
      setOtpMessage('One-time sign-in link sent. Open it from your email to continue.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not send Firebase email link');
    } finally {
      setOtpLoading(false);
    }
  };

  const completeManualEmailLink = async (e) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);

    try {
      const result = await signInWithEmailLink(firebaseAuth, otpEmail, window.location.href);
      await finishFirebaseLogin(result.user);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not complete Firebase email sign in');
    } finally {
      setOtpLoading(false);
    }
  };

  const onEmailLinkPage = isFirebaseConfigured && isSignInWithEmailLink(firebaseAuth, window.location.href);

  return (
    <div className="min-h-screen bg-[#080a0f] text-white flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Crypto command center</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Track markets, set alerts, and move faster.
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-400">
            Sign in with your password or use Firebase email OTP to enter with a one-time link.
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
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-800" />
            <span className="text-xs uppercase tracking-wide text-gray-500">or</span>
            <div className="h-px flex-1 bg-gray-800" />
          </div>

          <form className="space-y-3 text-left" onSubmit={onEmailLinkPage ? completeManualEmailLink : sendFirebaseOtp}>
            <label htmlFor="otpEmail" className="block text-sm font-medium text-gray-300">
              Firebase email OTP
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="otpEmail"
                name="otpEmail"
                type="email"
                className="flex-1 px-3 py-2.5 border border-gray-700 placeholder-gray-500 text-white bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
                placeholder="you@example.com"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
              />
              <button
                type="submit"
                disabled={otpLoading}
                className="px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
              >
                {otpLoading ? 'Working...' : onEmailLinkPage ? 'Verify link' : 'Send OTP'}
              </button>
            </div>
            {otpSent && <p className="text-sm text-cyan-200">Check your inbox and open the one-time link.</p>}
            {otpMessage && <p className="text-sm text-gray-400">{otpMessage}</p>}
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

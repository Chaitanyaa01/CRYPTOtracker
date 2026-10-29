import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import CoinChart from './CoinChart';
import CoinIcon from './CoinIcon';
import { apiEndpoint } from '../smallapi';
import { useBinanceTicker } from '../hooks/useBinanceTicker';

const WATCHLIST_KEY = 'crypto_watchlist_v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function formatCompactUsd(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPrice(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const max =
    abs >= 1 ? 2 : abs >= 0.01 ? 4 : abs >= 0.0001 ? 6 : 8;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: max,
  });
}

function readWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const Home = ({ user: propUser }) => {
  const [currentUser] = useState(() => {
    if (propUser) return propUser;
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCoinId, setSelectedCoinId] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [marketFilter, setMarketFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('markets'); // 'markets' | 'alerts'
  const [watchlist, setWatchlist] = useState(readWatchlist);
  const [feedStatus, setFeedStatus] = useState(null);

  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({
    coinId: '',
    condition: 'above',
    targetPrice: '',
    emailNotification: true,
  });
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Test email state
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);

  // Real-time SSE alert notification toast
  const [liveAlertToast, setLiveAlertToast] = useState(null);

  // Real-Time Binance WebSocket Hook
  const { isConnected: wsConnected, isLive, toggleLive, tickerUpdates, flashMap } =
    useBinanceTicker(true);

  const fetchCoins = useCallback(async () => {
    try {
      const response = await axios.get(`${apiEndpoint}/api/coins`);
      setCoins(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const refreshFeedStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${apiEndpoint}/api/health`);
      setFeedStatus(data);
    } catch {
      setFeedStatus(null);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${apiEndpoint}/api/alerts`, {
        headers: getAuthHeaders(),
      });
      setAlerts(data.alerts || []);
      setAlertError('');
    } catch (err) {
      setAlertError(err.response?.data?.message || '');
    }
  }, []);

  // Live SSE connection to backend for instantaneous real-time alert popups
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let eventSource = null;
    try {
      eventSource = new EventSource(
        `${apiEndpoint}/api/alerts/stream?token=${encodeURIComponent(token)}`
      );

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'ALERT_TRIGGERED' && payload.alert) {
            setLiveAlertToast(payload.alert);
            fetchAlerts();
          }
        } catch {}
      };
    } catch (e) {
      console.warn('SSE connection error:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [fetchAlerts]);

  const handleManualRefresh = async () => {
    setLoading(true);
    await fetchCoins();
    await refreshFeedStatus();
    await fetchAlerts();
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setAlertLoading(true);
    setAlertError('');
    setAlertMessage('');

    try {
      const { data } = await axios.post(`${apiEndpoint}/api/alerts`, alertForm, {
        headers: getAuthHeaders(),
      });
      setAlerts((prev) => [data.alert, ...prev]);
      setAlertForm((prev) => ({ ...prev, targetPrice: '' }));
      setAlertMessage(
        data.alert.isTriggered
          ? 'Alert created and already triggered! Email alert dispatched.'
          : 'Alert created successfully! You will be notified when triggered.'
      );
      setTimeout(() => {
        setIsAlertModalOpen(false);
        setAlertMessage('');
      }, 1500);
    } catch (err) {
      setAlertError(err.response?.data?.message || 'Could not create alert');
    } finally {
      setAlertLoading(false);
    }
  };

  const openAlertModalForCoin = (coinId) => {
    const targetCoin = liveCoins.find((c) => c.coin_id === coinId) || liveCoins[0];
    const curPrice = targetCoin ? targetCoin.price_usd : '';
    setAlertForm({
      coinId: targetCoin ? targetCoin.coin_id : '',
      condition: 'above',
      targetPrice: curPrice ? (curPrice * 1.05).toFixed(curPrice >= 1 ? 2 : 4) : '',
      emailNotification: true,
    });
    setAlertError('');
    setAlertMessage('');
    setIsAlertModalOpen(true);
  };

  const handlePresetPercentage = (pct) => {
    const targetCoin = liveCoins.find((c) => c.coin_id === alertForm.coinId);
    if (!targetCoin || !targetCoin.price_usd) return;
    const currentPrice = targetCoin.price_usd;
    const newTarget = currentPrice * (1 + pct / 100);
    const decimals = newTarget >= 1 ? 2 : newTarget >= 0.01 ? 4 : 6;
    setAlertForm((prev) => ({
      ...prev,
      condition: pct >= 0 ? 'above' : 'below',
      targetPrice: newTarget.toFixed(decimals),
    }));
  };

  const handleSendTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    try {
      const { data } = await axios.post(
        `${apiEndpoint}/api/alerts/test-email`,
        {},
        { headers: getAuthHeaders() }
      );
      setTestEmailStatus({
        type: 'success',
        message: data.message || 'Test notification dispatched successfully!',
        previewUrl: data.previewUrl,
      });
    } catch (err) {
      setTestEmailStatus({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Could not send test notification',
        previewUrl: null,
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const updateAlert = async (alertId, payload) => {
    setAlertError('');
    try {
      const { data } = await axios.patch(`${apiEndpoint}/api/alerts/${alertId}`, payload, {
        headers: getAuthHeaders(),
      });
      setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? data.alert : alert)));
    } catch (err) {
      setAlertError(err.response?.data?.message || 'Could not update alert');
    }
  };

  const deleteAlert = async (alertId) => {
    setAlertError('');
    try {
      await axios.delete(`${apiEndpoint}/api/alerts/${alertId}`, {
        headers: getAuthHeaders(),
      });
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setAlertError(err.response?.data?.message || 'Could not delete alert');
    }
  };

  const toggleWatchlist = (coinId, e) => {
    e.stopPropagation();
    setWatchlist((prev) => {
      const next = prev.includes(coinId) ? prev.filter((id) => id !== coinId) : [...prev, coinId];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Merge real-time WebSocket ticker data with base coin list
  const liveCoins = useMemo(() => {
    return coins.map((c) => {
      const sym = c.symbol?.toLowerCase();
      const update = tickerUpdates[sym];
      if (!update) return c;

      return {
        ...c,
        price_usd: update.price,
        change_24h_pct: update.changePct,
        high_24h: update.high || c.high_24h,
        low_24h: update.low || c.low_24h,
        volume_24h: update.volume || c.volume_24h,
      };
    });
  }, [coins, tickerUpdates]);

  const baseFiltered = useMemo(() => {
    return liveCoins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [liveCoins, searchTerm]);

  const filteredCoins = useMemo(() => {
    return baseFiltered.filter((coin) => {
      const ch = coin.change_24h_pct || 0;
      if (marketFilter === 'gainers') return ch > 0;
      if (marketFilter === 'losers') return ch < 0;
      if (marketFilter === 'watchlist') return watchlist.includes(coin.coin_id);
      return true;
    });
  }, [baseFiltered, marketFilter, watchlist]);

  const stats = useMemo(() => {
    const n = filteredCoins.length;
    const cap = filteredCoins.reduce((s, c) => s + (c.market_cap || 0), 0);
    const vol = filteredCoins.reduce((s, c) => s + (c.volume_24h || 0), 0);
    const up = filteredCoins.filter((c) => (c.change_24h_pct || 0) > 0).length;
    const down = filteredCoins.filter((c) => (c.change_24h_pct || 0) < 0).length;
    const triggered = alerts.filter((alert) => alert.isTriggered).length;

    // Best and worst performers
    let topGainer = null;
    let topLoser = null;
    for (const c of liveCoins) {
      if (c.change_24h_pct != null) {
        if (!topGainer || c.change_24h_pct > topGainer.change_24h_pct) topGainer = c;
        if (!topLoser || c.change_24h_pct < topLoser.change_24h_pct) topLoser = c;
      }
    }

    return { n, cap, vol, up, down, triggered, topGainer, topLoser };
  }, [filteredCoins, alerts, liveCoins]);

  const sortedCoins = useMemo(() => {
    return [...filteredCoins].sort((a, b) => {
      if (!sortKey) return 0;
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (valA == null) valA = 0;
      if (valB == null) valB = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (valA instanceof Date && valB instanceof Date) {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      if (sortKey === 'timestamp') {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        return sortOrder === 'asc' ? ta - tb : tb - ta;
      }
      return 0;
    });
  }, [filteredCoins, sortKey, sortOrder]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'name' || key === 'symbol' ? 'asc' : 'desc');
    }
  };

  useEffect(() => {
    fetchCoins();
    refreshFeedStatus();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchCoins();
      refreshFeedStatus();
      fetchAlerts();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCoins, refreshFeedStatus, fetchAlerts]);

  const triggeredAlerts = alerts.filter((alert) => alert.isTriggered);
  const activeAlerts = alerts.filter((alert) => alert.active && !alert.isTriggered);

  const filterBtn = (id, label, icon) => (
    <button
      type="button"
      onClick={() => setMarketFilter(id)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
        marketFilter === id
          ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
          : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
      }`}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      {id === 'watchlist' && watchlist.length > 0 && (
        <span className="ml-1 rounded-full bg-slate-900/10 dark:bg-white/20 px-1.5 py-0.2 text-[10px]">
          {watchlist.length}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090e] py-6 px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Floating Real-time SSE Alert Notification Toast */}
      {liveAlertToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-50 max-w-sm rounded-2xl border border-amber-500/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:bg-slate-900/95 transition-all animate-bounce"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-left">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                Live Price Alert Triggered!
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {liveAlertToast.coinName} has crossed {formatPrice(liveAlertToast.targetPrice)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                Triggered price: {formatPrice(liveAlertToast.triggeredPrice)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLiveAlertToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        </aside>
      )}

      {/* Quick Alert Creation Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-sm">
                  🔔
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Create Price Alert</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Get notified via email & live desktop toast</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Select Cryptocurrency
                </label>
                <select
                  required
                  value={alertForm.coinId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const c = liveCoins.find((x) => x.coin_id === cId);
                    setAlertForm((prev) => ({
                      ...prev,
                      coinId: cId,
                      targetPrice: c?.price_usd ? (c.price_usd * 1.05).toFixed(c.price_usd >= 1 ? 2 : 4) : '',
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select coin...</option>
                  {liveCoins.map((coin) => (
                    <option key={coin.coin_id} value={coin.coin_id}>
                      {coin.name} ({coin.symbol.toUpperCase()}) — {formatPrice(coin.price_usd)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Trigger Condition
                  </label>
                  <select
                    value={alertForm.condition}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, condition: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="above">Above or Equal (≥)</option>
                    <option value="below">Below or Equal (≤)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Target Price (USD)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={alertForm.targetPrice}
                    onChange={(e) => setAlertForm((prev) => ({ ...prev, targetPrice: e.target.value }))}
                    placeholder="e.g. 98500"
                    className="w-full font-mono rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick Percentage Presets */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Quick Target Presets:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[-10, -5, 2, 5, 10, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePresetPercentage(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        pct > 0
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400'
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Notification Option */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={alertForm.emailNotification}
                    onChange={(e) =>
                      setAlertForm((prev) => ({ ...prev, emailNotification: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span>
                    Send automated email alert to{' '}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {currentUser?.email || 'my registered email'}
                    </strong>
                  </span>
                </label>
              </div>

              {alertMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-medium">
                  {alertMessage}
                </div>
              )}
              {alertError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 text-xs font-medium">
                  {alertError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={alertLoading}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-400/20 hover:bg-amber-300 disabled:opacity-50 transition-all"
                >
                  {alertLoading ? 'Saving...' : 'Set Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Institutional Market Metrics Banner */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 transition-all">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Market Cap</p>
            <p className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
              {formatCompactUsd(stats.cap)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Top 50 cryptos</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 transition-all">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">24h Volume</p>
            <p className="text-lg font-black font-mono text-sky-600 dark:text-cyan-400 mt-1">
              {formatCompactUsd(stats.vol)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Global 24h turnover</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 transition-all">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Market Breadth</p>
            <p className="text-lg font-black font-mono mt-1 flex items-center gap-1.5">
              <span className="text-emerald-500">{stats.up} ▲</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-rose-500">{stats.down} ▼</span>
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Gainers vs losers</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 transition-all">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Top Gainer</p>
            {stats.topGainer ? (
              <>
                <p className="text-lg font-black font-mono text-emerald-500 mt-1 truncate">
                  +{stats.topGainer.change_24h_pct?.toFixed(2)}%
                </p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase mt-0.5 truncate">
                  {stats.topGainer.name} ({stats.topGainer.symbol})
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-slate-400 mt-1">—</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 transition-all">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Live Feed</p>
            <div
              onClick={toggleLive}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${wsConnected && isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className={wsConnected && isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                {wsConnected && isLive ? 'Binance WS' : 'Paused'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {feedStatus?.db?.state === 'connected' ? 'API + DB Connected' : 'Sub-second updates'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 transition-all">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Alert Center</p>
            <p className="text-lg font-black font-mono text-amber-500 dark:text-amber-400 mt-1">
              {alerts.length} <span className="text-xs font-normal text-slate-400">alerts</span>
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.triggered > 0 ? `${stats.triggered} triggered` : '0 triggered'}
            </p>
          </div>
        </section>

        {/* Navigation Tabs (Live Markets vs. Alert Manager) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('markets')}
              className={`relative px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'markets'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>📊 Live Markets</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'markets' ? 'bg-slate-950 text-white' : 'bg-slate-200 dark:bg-slate-800'
              }`}>
                {liveCoins.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`relative px-4 py-2 rounded-xl text-sm font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'alerts'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>🔔 Alert Manager</span>
              {alerts.length > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  activeTab === 'alerts' ? 'bg-slate-950 text-white' : 'bg-slate-200 dark:bg-slate-800'
                }`}>
                  {alerts.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAlertModalForCoin(selectedCoinId || 'bitcoin')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-400/20 hover:from-amber-300 hover:to-amber-400 transition-all"
            >
              <span>+ New Price Alert</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              title="Refresh Coin Data"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-xs"
            >
              <span className={loading ? 'inline-block animate-spin' : ''}>↻</span>
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MARKETS VIEW */}
        {activeTab === 'markets' && (
          <div className="space-y-4">
            {/* Search, Filter Pills & View Switcher */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  🔍
                </span>
                <input
                  type="search"
                  placeholder="Search 50+ coins by name or symbol (e.g. BTC, Solana)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:bg-slate-900/80 dark:text-white dark:border-slate-800 dark:placeholder:text-slate-500 text-sm font-semibold transition-all shadow-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search coins"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {filterBtn('all', 'All', '🌐')}
                {filterBtn('gainers', 'Gainers', '🚀')}
                {filterBtn('losers', 'Losers', '📉')}
                {filterBtn('watchlist', 'Watchlist', '⭐')}
              </div>

              <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 self-start">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-700/50 dark:text-rose-200 px-4 py-3 rounded-2xl text-sm font-medium">
                {error}
              </div>
            )}

            {!loading && !error && sortedCoins.length === 0 && (
              <div className="text-center text-slate-400 dark:text-slate-500 py-16 bg-white dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-base font-bold">No coins found matching "{searchTerm}"</p>
                <p className="text-xs mt-1">Try another filter or clear the search term.</p>
              </div>
            )}

            {/* Table View (With Inline Accordion Chart) */}
            {!loading && !error && sortedCoins.length > 0 && viewMode === 'table' && (
              <div className="bg-white shadow-sm rounded-3xl overflow-hidden border border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800/80 transition-colors">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/80">
                    <thead className="bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-sm">
                      <tr>
                        <th className="w-10 px-3 py-3.5 text-left text-xs font-bold text-slate-400 uppercase" aria-label="Watchlist" />
                        <th
                          className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('market_cap_rank')}
                        >
                          # {sortKey === 'market_cap_rank' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                          className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          Asset {sortKey === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                          className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('price_usd')}
                        >
                          Price (Live) {sortKey === 'price_usd' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                          className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('change_24h_pct')}
                        >
                          24h % {sortKey === 'change_24h_pct' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                          className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('market_cap')}
                        >
                          Market Cap {sortKey === 'market_cap' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                          className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                          onClick={() => handleSort('volume_24h')}
                        >
                          24h Volume {sortKey === 'volume_24h' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      {sortedCoins.map((coin) => {
                        const isSel = selectedCoinId === coin.coin_id;
                        const watched = watchlist.includes(coin.coin_id);
                        const flash = flashMap[coin.symbol?.toLowerCase()];

                        const flashClass =
                          flash === 'up'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-lg'
                            : flash === 'down'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded-lg'
                            : '';

                        const isPositive = (coin.change_24h_pct || 0) >= 0;

                        return (
                          <React.Fragment key={coin._id}>
                            <tr
                              className={`group cursor-pointer transition-colors ${
                                isSel
                                  ? 'bg-amber-500/10 dark:bg-amber-500/10'
                                  : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                              }`}
                              onClick={() => setSelectedCoinId(isSel ? null : coin.coin_id)}
                            >
                              <td className="px-3 py-3.5">
                                <button
                                  type="button"
                                  onClick={(e) => toggleWatchlist(coin.coin_id, e)}
                                  className={`text-base leading-none p-1 rounded-md transition-transform active:scale-125 ${
                                    watched ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700 hover:text-slate-400'
                                  }`}
                                  aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                                >
                                  {watched ? '★' : '☆'}
                                </button>
                              </td>

                              <td className="px-3 py-3.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
                                {coin.market_cap_rank ?? '—'}
                              </td>

                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <CoinIcon src={coin.image} name={coin.name} symbol={coin.symbol} size={36} />
                                  <div className="text-left">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                        {coin.name}
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-mono">
                                        {coin.symbol}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                      {isSel ? '▲ Close TradingView chart' : '▼ Click to expand chart'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                <span className={flashClass}>{formatPrice(coin.price_usd)}</span>
                              </td>

                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                    isPositive
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  <span>{isPositive ? '▲' : '▼'}</span>
                                  <span>{Math.abs(coin.change_24h_pct || 0).toFixed(2)}%</span>
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {formatCompactUsd(coin.market_cap)}
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {formatCompactUsd(coin.volume_24h)}
                              </td>

                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => openAlertModalForCoin(coin.coin_id)}
                                    title="Set price alert"
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-500 dark:border-slate-800 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
                                  >
                                    🔔
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCoinId(isSel ? null : coin.coin_id)}
                                    title={isSel ? 'Close chart' : 'Open TradingView chart'}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                      isSel
                                        ? 'bg-amber-400 text-slate-950 font-black'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    {isSel ? 'Hide' : 'Chart'}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Inline Accordion Chart Row directly beneath this coin */}
                            {isSel && (
                              <tr className="bg-slate-50/90 dark:bg-slate-950/80 border-b-2 border-amber-500/50">
                                <td colSpan={8} className="p-4 sm:p-6">
                                  <CoinChart
                                    coin={coin}
                                    onClose={() => setSelectedCoinId(null)}
                                    onSetAlert={() => openAlertModalForCoin(coin.coin_id)}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Grid View (With Inline Expandable Chart) */}
            {!loading && !error && sortedCoins.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedCoins.map((coin) => {
                  const isSel = selectedCoinId === coin.coin_id;
                  const watched = watchlist.includes(coin.coin_id);
                  const ch = coin.change_24h_pct || 0;
                  const flash = flashMap[coin.symbol?.toLowerCase()];

                  const flashClass =
                    flash === 'up'
                      ? 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-lg'
                      : flash === 'down'
                      ? 'bg-rose-500/25 text-rose-600 dark:text-rose-400 font-extrabold px-1.5 py-0.5 rounded-lg'
                      : '';

                  return (
                    <React.Fragment key={coin._id}>
                      <article
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCoinId(isSel ? null : coin.coin_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCoinId(isSel ? null : coin.coin_id);
                          }
                        }}
                        className={`rounded-3xl border p-5 text-left cursor-pointer transition-all outline-none ${
                          isSel
                            ? 'border-amber-500 bg-amber-500/5 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40'
                            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-900/90'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <CoinIcon src={coin.image} name={coin.name} symbol={coin.symbol} size={48} />
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-slate-900 dark:text-white truncate text-base">
                                {coin.name}
                              </h3>
                              <p className="text-xs text-slate-400 uppercase font-mono font-bold">{coin.symbol}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openAlertModalForCoin(coin.coin_id)}
                              title="Set alert"
                              className="text-base p-1 text-slate-400 hover:text-amber-500"
                            >
                              🔔
                            </button>
                            <button
                              type="button"
                              onClick={(e) => toggleWatchlist(coin.coin_id, e)}
                              className={`text-lg leading-none p-1 rounded-md flex-shrink-0 ${
                                watched ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700 hover:text-slate-400'
                              }`}
                              aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                            >
                              {watched ? '★' : '☆'}
                            </button>
                          </div>
                        </div>

                        <p className="mt-4 text-2xl font-black text-slate-900 dark:text-white font-mono">
                          <span className={flashClass}>{formatPrice(coin.price_usd)}</span>
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold font-mono ${
                                ch >= 0
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              <span>{ch >= 0 ? '▲' : '▼'}</span>
                              <span>{Math.abs(ch).toFixed(2)}%</span>
                            </span>
                            {coin.market_cap_rank != null && (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-mono">
                                #{coin.market_cap_rank}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-amber-500">
                            {isSel ? '▲ Close chart' : '▼ View chart'}
                          </span>
                        </div>
                      </article>

                      {/* Inline Chart below card in Grid View */}
                      {isSel && (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                          <CoinChart
                            coin={coin}
                            onClose={() => setSelectedCoinId(null)}
                            onSetAlert={() => openAlertModalForCoin(coin.coin_id)}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALERTS MANAGER VIEW */}
        {activeTab === 'alerts' && (
          <div className="space-y-6 text-left">
            {/* Alert Board Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Active Price Alerts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your price triggers. Real-time notifications are sent via email and desktop toast when hit.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailLoading}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shadow-xs"
                >
                  {testEmailLoading ? 'Sending...' : '✉️ Send Test Email'}
                </button>
                <button
                  type="button"
                  onClick={() => openAlertModalForCoin('bitcoin')}
                  className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-400/20"
                >
                  + Create Alert
                </button>
              </div>
            </div>

            {testEmailStatus && (
              <div
                className={`p-4 rounded-2xl text-xs font-medium ${
                  testEmailStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <p>{testEmailStatus.message}</p>
                {testEmailStatus.previewUrl && (
                  <a
                    href={testEmailStatus.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block font-bold underline text-sky-600 dark:text-sky-400 hover:opacity-80"
                  >
                    🔗 Open Delivered Email Preview in Browser →
                  </a>
                )}
              </div>
            )}

            {/* Triggered Alerts Section */}
            {triggeredAlerts.length > 0 && (
              <div className="rounded-3xl border border-amber-500/50 bg-amber-500/5 p-6 space-y-3">
                <h4 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span>🚨</span> Triggered Alerts ({triggeredAlerts.length})
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {triggeredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-amber-300 bg-white p-4 dark:border-amber-500/30 dark:bg-slate-900 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white">{alert.coinName}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold mt-0.5">
                            Hit {formatPrice(alert.triggeredPrice)} ({alert.condition} {formatPrice(alert.targetPrice)})
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold uppercase">
                          Triggered
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => updateAlert(alert.id, { resetTriggered: true })}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-800"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAlert(alert.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-slate-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Standing Alerts Section */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span>⚡</span> Standing Watch Alerts ({activeAlerts.length})
              </h4>

              {activeAlerts.length === 0 && (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <p className="font-bold">No active standing alerts.</p>
                  <p className="text-xs mt-1">Click "+ Create Alert" or click the 🔔 icon on any coin to set one.</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/60 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white">{alert.coinName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          Target: {alert.condition.toUpperCase()} {formatPrice(alert.targetPrice)}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => updateAlert(alert.id, { emailNotification: !alert.emailNotification })}
                        className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                          alert.emailNotification
                            ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800'
                            : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {alert.emailNotification ? '✉️ Email On' : '🔕 Email Off'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateAlert(alert.id, { active: !alert.active })}
                          className="px-2 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          Pause
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAlert(alert.id)}
                          className="px-2 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-slate-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

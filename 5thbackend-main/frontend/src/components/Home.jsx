import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import CoinChart from './CoinChart';
import CoinIcon from './CoinIcon';
import { apiEndpoint } from '../smallapi';

const WATCHLIST_KEY = 'crypto_watchlist_v1';

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

const Home = () => {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCoinId, setSelectedCoinId] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [marketFilter, setMarketFilter] = useState('all');
  const [watchlist, setWatchlist] = useState(readWatchlist);
  const [feedStatus, setFeedStatus] = useState(null);

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

  const handleManualRefresh = async () => {
    setLoading(true);
    await fetchCoins();
    await refreshFeedStatus();
  };

  const toggleWatchlist = (coinId, e) => {
    e.stopPropagation();
    setWatchlist((prev) => {
      const next = prev.includes(coinId) ? prev.filter((id) => id !== coinId) : [...prev, coinId];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  const baseFiltered = useMemo(() => {
    return coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coins, searchTerm]);

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
    return { n, cap, vol, up, down };
  }, [filteredCoins]);

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
    const interval = setInterval(() => {
      fetchCoins();
      refreshFeedStatus();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCoins, refreshFeedStatus]);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!selectedCoinId) return;
      setChartLoading(true);
      setChartError(null);
      try {
        const response = await axios.get(`${apiEndpoint}/api/history/${selectedCoinId}`);
        setHistoricalData(response.data);
        setChartLoading(false);
      } catch (err) {
        setChartError(err.message);
        setChartLoading(false);
      }
    };
    fetchHistoricalData();
  }, [selectedCoinId]);

  const selectedCoin = coins.find((c) => c.coin_id === selectedCoinId);
  const lastFetchLabel = feedStatus?.crypto?.lastFetchAt
    ? new Date(feedStatus.crypto.lastFetchAt).toLocaleString()
    : null;

  const filterBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setMarketFilter(id)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        marketFilter === id
          ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 py-8 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Markets</h2>
            <p className="text-sm text-gray-500 mt-1">
              Top listings with rankings, volume, and watchlist. Click a row for price history.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white ring-1 ring-gray-600 hover:bg-gray-700 disabled:opacity-50"
            >
              <span className={loading ? 'inline-block animate-spin' : ''} aria-hidden>
                ↻
              </span>
              Refresh
            </button>
            {lastFetchLabel && (
              <span className="text-xs text-gray-500">
                Data sync: {lastFetchLabel}
                {feedStatus?.crypto?.lastFetchSuccess === false ? ' (last attempt failed)' : ''}
              </span>
            )}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Showing</p>
            <p className="text-xl font-semibold text-white mt-1">{stats.n}</p>
            <p className="text-xs text-gray-500 mt-0.5">coins</p>
          </div>
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Combined cap</p>
            <p className="text-xl font-semibold text-amber-400 mt-1">{formatCompactUsd(stats.cap)}</p>
            <p className="text-xs text-gray-500 mt-0.5">filtered set</p>
          </div>
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">24h volume</p>
            <p className="text-xl font-semibold text-cyan-400 mt-1">{formatCompactUsd(stats.vol)}</p>
            <p className="text-xs text-gray-500 mt-0.5">filtered set</p>
          </div>
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Gainers / losers</p>
            <p className="text-xl font-semibold mt-1">
              <span className="text-emerald-400">{stats.up}</span>
              <span className="text-gray-600 mx-1">/</span>
              <span className="text-rose-400">{stats.down}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">in view</p>
          </div>
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4 col-span-2 sm:col-span-4 lg:col-span-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">Watchlist</p>
            <p className="text-xl font-semibold text-violet-400 mt-1">{watchlist.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">saved locally</p>
          </div>
        </section>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="search"
            placeholder="Search name or symbol…"
            className="flex-1 p-3 rounded-xl bg-gray-900 text-white border border-gray-700 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40 placeholder:text-gray-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search coins"
          />
          <div className="flex flex-wrap gap-2">
            {filterBtn('all', 'All')}
            {filterBtn('gainers', 'Gainers')}
            {filterBtn('losers', 'Losers')}
            {filterBtn('watchlist', 'Watchlist')}
          </div>
          <div className="flex rounded-xl border border-gray-700 p-1 bg-gray-900/50 self-start">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                viewMode === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Grid
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
          </div>
        )}

        {error && (
          <div className="bg-rose-950/50 border border-rose-700/50 text-rose-200 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {!loading && !error && sortedCoins.length === 0 && (
          <p className="text-center text-gray-500 py-12">
            No coins match your filters. Try another filter or clear the search.
          </p>
        )}

        {!loading && !error && sortedCoins.length > 0 && viewMode === 'table' && (
          <div className="bg-gray-900/60 shadow-xl rounded-xl overflow-hidden border border-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-950/80">
                  <tr>
                    <th className="w-10 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" aria-label="Watchlist" />
                    <th
                      className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('market_cap_rank')}
                    >
                      #
                      {sortKey === 'market_cap_rank' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      Coin
                      {sortKey === 'name' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('symbol')}
                    >
                      Symbol
                      {sortKey === 'symbol' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('price_usd')}
                    >
                      Price
                      {sortKey === 'price_usd' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('change_24h_pct')}
                    >
                      24h %
                      {sortKey === 'change_24h_pct' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('market_cap')}
                    >
                      Mkt cap
                      {sortKey === 'market_cap' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('volume_24h')}
                    >
                      Vol 24h
                      {sortKey === 'volume_24h' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                      onClick={() => handleSort('timestamp')}
                    >
                      Updated
                      {sortKey === 'timestamp' && <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedCoins.map((coin) => {
                    const isSel = selectedCoinId === coin.coin_id;
                    const watched = watchlist.includes(coin.coin_id);
                    return (
                      <tr
                        key={coin._id}
                        className={`cursor-pointer transition-colors ${
                          isSel ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-gray-800/80'
                        }`}
                        onClick={() => setSelectedCoinId(coin.coin_id)}
                      >
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={(e) => toggleWatchlist(coin.coin_id, e)}
                            className={`text-lg leading-none p-1 rounded-md transition-colors ${
                              watched ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'
                            }`}
                            aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                            title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            {watched ? '★' : '☆'}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {coin.market_cap_rank ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CoinIcon src={coin.image} name={coin.name} symbol={coin.symbol} size={36} />
                            <span className="text-sm font-medium text-white">{coin.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 uppercase">{coin.symbol}</td>
                        <td className="px-4 py-3 text-sm text-white whitespace-nowrap font-mono">
                          {formatPrice(coin.price_usd)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm whitespace-nowrap font-medium ${
                            (coin.change_24h_pct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {(coin.change_24h_pct || 0).toFixed(2)}%
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap font-mono"
                          title={coin.market_cap != null ? `$${coin.market_cap.toLocaleString()}` : ''}
                        >
                          {formatCompactUsd(coin.market_cap)}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap font-mono"
                          title={coin.volume_24h != null ? `$${coin.volume_24h.toLocaleString()}` : ''}
                        >
                          {coin.volume_24h != null ? formatCompactUsd(coin.volume_24h) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {coin.timestamp ? new Date(coin.timestamp).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && sortedCoins.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCoins.map((coin) => {
              const isSel = selectedCoinId === coin.coin_id;
              const watched = watchlist.includes(coin.coin_id);
              const ch = coin.change_24h_pct || 0;
              return (
                <article
                  key={coin._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCoinId(coin.coin_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCoinId(coin.coin_id);
                    }
                  }}
                  className={`rounded-2xl border p-4 text-left cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isSel
                      ? 'border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10'
                      : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <CoinIcon src={coin.image} name={coin.name} symbol={coin.symbol} size={48} />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">{coin.name}</h3>
                        <p className="text-xs text-gray-500 uppercase">{coin.symbol}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => toggleWatchlist(coin.coin_id, e)}
                      className={`text-xl leading-none p-1 rounded-md flex-shrink-0 ${
                        watched ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'
                      }`}
                      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      {watched ? '★' : '☆'}
                    </button>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-white font-mono">{formatPrice(coin.price_usd)}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md font-medium ${
                        ch >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {ch >= 0 ? '+' : ''}
                      {ch.toFixed(2)}% 24h
                    </span>
                    {coin.market_cap_rank != null && (
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-800 text-gray-400">
                        Rank #{coin.market_cap_rank}
                      </span>
                    )}
                    <span
                      className="inline-flex px-2 py-0.5 rounded-md bg-gray-800 text-gray-400"
                      title={coin.volume_24h != null ? `$${coin.volume_24h.toLocaleString()}` : ''}
                    >
                      Vol {coin.volume_24h != null ? formatCompactUsd(coin.volume_24h) : '—'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedCoinId && (
          <div className="relative">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSelectedCoinId(null)}
                className="text-sm text-gray-400 hover:text-white px-3 py-1 rounded-lg bg-gray-800 border border-gray-700"
              >
                Close chart
              </button>
            </div>
            {chartLoading && <div className="flex justify-center items-center text-gray-400 py-8">Loading chart…</div>}
            {chartError && (
              <div className="bg-rose-950/50 border border-rose-700/50 text-rose-200 px-4 py-3 rounded-xl">
                Error loading chart: {chartError}
              </div>
            )}
            {!chartLoading && !chartError && historicalData.length > 0 && (
              <CoinChart
                historicalData={historicalData}
                coinName={selectedCoin?.name}
                coinImage={selectedCoin?.image}
              />
            )}
            {!chartLoading && !chartError && historicalData.length === 0 && (
              <div className="text-center text-gray-500 py-8">No historical data for this coin yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;

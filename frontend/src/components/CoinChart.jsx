import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { createChart, AreaSeries, ColorType } from 'lightweight-charts';
import { useTheme } from '../context/ThemeContext';
import { apiEndpoint } from '../smallapi';

const TIMEFRAMES = [
  { label: '24H', days: '1' },
  { label: '7D', days: '7' },
  { label: '30D', days: '30' },
  { label: '90D', days: '90' },
  { label: '1Y', days: '365' },
  { label: 'ALL', days: 'max' },
];

function formatCurrency(n, maxDecimals = 4) {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const decimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, maxDecimals),
  }).format(n);
}

function formatCompact(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n);
}

const CoinChart = ({ coin, onClose, onSetAlert }) => {
  const { isDark } = useTheme();
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef(null);

  const [timeframe, setTimeframe] = useState('7');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverData, setHoverData] = useState(null);
  const [periodChange, setPeriodChange] = useState(null);

  const coinId = coin?.coin_id;

  const fetchChartData = useCallback(async () => {
    if (!coinId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${apiEndpoint}/api/market-chart/${coinId}?days=${timeframe}`
      );
      const rawPrices = response.data?.prices || [];

      if (!rawPrices || rawPrices.length === 0) {
        throw new Error('No price points available for this timeframe.');
      }

      // Convert to Lightweight Charts format: { time: unixTimestampInSeconds, value: price }
      const formatted = [];
      const seenTimes = new Set();

      for (const [timestampMs, price] of rawPrices) {
        const timeSec = Math.floor(timestampMs / 1000);
        if (!seenTimes.has(timeSec) && Number.isFinite(price)) {
          seenTimes.add(timeSec);
          formatted.push({ time: timeSec, value: Number(price) });
        }
      }

      formatted.sort((a, b) => a.time - b.time);

      if (formatted.length >= 2) {
        const firstPrice = formatted[0].value;
        const lastPrice = formatted[formatted.length - 1].value;
        const diff = lastPrice - firstPrice;
        const pct = (diff / firstPrice) * 100;
        setPeriodChange({ diff, pct, isPositive: diff >= 0 });
      } else {
        setPeriodChange(null);
      }

      if (seriesRef.current && chartInstanceRef.current) {
        const isUp =
          formatted.length >= 2
            ? formatted[formatted.length - 1].value >= formatted[0].value
            : true;

        const lineColor = isUp ? '#10b981' : '#f43f5e';
        const topColor = isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';
        const bottomColor = isUp ? 'rgba(16, 185, 129, 0.0)' : 'rgba(244, 63, 94, 0.0)';

        seriesRef.current.applyOptions({
          lineColor,
          topColor,
          bottomColor,
        });

        seriesRef.current.setData(formatted);
        chartInstanceRef.current.timeScale().fitContent();
      }

      setLoading(false);
    } catch (err) {
      console.warn('Chart fetch error:', err.message);
      setError(err.response?.data?.message || err.message || 'Failed to load chart');
      setLoading(false);
    }
  }, [coinId, timeframe]);

  // Initialize and manage TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    container.innerHTML = '';

    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'inherit',
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor,
        autoScale: true,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      crosshair: {
        vertLine: {
          color: isDark ? 'rgba(251, 191, 36, 0.5)' : 'rgba(217, 119, 6, 0.5)',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: isDark ? 'rgba(251, 191, 36, 0.5)' : 'rgba(217, 119, 6, 0.5)',
          width: 1,
          style: 2,
        },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.35)',
      bottomColor: 'rgba(16, 185, 129, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    chartInstanceRef.current = chart;
    seriesRef.current = series;

    // Crosshair move subscription for real-time hover stats
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > 320
      ) {
        setHoverData(null);
      } else {
        const price = param.seriesData.get(series);
        if (price != null) {
          const timeMs = (param.time || 0) * 1000;
          setHoverData({
            price: price.value ?? price,
            date: new Date(timeMs).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
        }
      }
    });

    // Resize observer for responsive layout
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0] && chartInstanceRef.current) {
        const { width } = entries[0].contentRect;
        chartInstanceRef.current.applyOptions({ width });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
      seriesRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // 24h High/Low Gauge calculation
  const currentPrice = coin?.price_usd || 0;
  const high24h = coin?.high_24h || currentPrice;
  const low24h = coin?.low_24h || currentPrice;
  const rangeSpan = high24h - low24h;
  const rangePct =
    rangeSpan > 0 ? Math.min(100, Math.max(0, ((currentPrice - low24h) / rangeSpan) * 100)) : 50;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-950 text-left transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          {coin?.image && (
            <img
              src={coin.image}
              alt={coin.name}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 object-cover ring-2 ring-amber-500/30"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {coin?.name}
              </h3>
              <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {coin?.symbol}
              </span>
              {coin?.market_cap_rank && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  Rank #{coin.market_cap_rank}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {hoverData ? formatCurrency(hoverData.price) : formatCurrency(currentPrice)}
              </span>
              {hoverData ? (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {hoverData.date}
                </span>
              ) : (
                periodChange && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      periodChange.isPositive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {periodChange.isPositive ? '+' : ''}
                    {periodChange.pct.toFixed(2)}% ({TIMEFRAMES.find((t) => t.days === timeframe)?.label})
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Timeframe Buttons + Close & Alert CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.days}
                type="button"
                onClick={() => setTimeframe(t.days)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeframe === t.days
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-amber-400 dark:text-slate-950'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {onSetAlert && (
            <button
              type="button"
              onClick={onSetAlert}
              className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 shadow-sm transition-colors"
            >
              🔔 Set Alert
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors"
              title="Close chart"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 24h High / Low Bar */}
      <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/40">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
          <span>
            24h Low: <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(low24h)}</strong>
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            24h Range Indicator
          </span>
          <span>
            24h High: <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(high24h)}</strong>
          </span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all duration-300"
            style={{ width: `${rangePct}%` }}
          />
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative mt-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-80" />
      </div>

      {/* Key Market Stats Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 border-t border-slate-200 dark:border-slate-800/80 pt-4 text-xs">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
          <p className="text-slate-500 dark:text-slate-400 font-medium">Market Cap</p>
          <p className="font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCompact(coin?.market_cap)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
          <p className="text-slate-500 dark:text-slate-400 font-medium">24h Volume</p>
          <p className="font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCompact(coin?.volume_24h)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
          <p className="text-slate-500 dark:text-slate-400 font-medium">All-Time High (ATH)</p>
          <p className="font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(coin?.ath)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
          <p className="text-slate-500 dark:text-slate-400 font-medium">All-Time Low (ATL)</p>
          <p className="font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(coin?.atl)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
          <p className="text-slate-500 dark:text-slate-400 font-medium">Circulating Supply</p>
          <p className="font-bold font-mono text-slate-900 dark:text-white mt-1">
            {coin?.circulating_supply != null ? coin.circulating_supply.toLocaleString() : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
          <p className="text-slate-500 dark:text-slate-400 font-medium">Total Supply</p>
          <p className="font-bold font-mono text-slate-900 dark:text-white mt-1">
            {coin?.total_supply != null ? coin.total_supply.toLocaleString() : '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoinChart;

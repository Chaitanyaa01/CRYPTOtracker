import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Connects to Binance public miniTicker WebSocket stream.
 * Provides second-by-second live price updates, 24h change, and subtle flash animations.
 */
export function useBinanceTicker(enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [tickerUpdates, setTickerUpdates] = useState({});
  const [flashMap, setFlashMap] = useState({});
  const [isLive, setIsLive] = useState(enabled);

  const prevPricesRef = useRef({});
  const flashTimeoutsRef = useRef({});
  const wsRef = useRef(null);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      if (!Array.isArray(data)) return;

      const newUpdates = {};
      const newFlashes = {};

      for (const item of data) {
        // e.g. item.s === "BTCUSDT"
        const symbolPair = item.s;
        if (!symbolPair.endsWith('USDT')) continue;

        const baseSymbol = symbolPair.replace('USDT', '').toLowerCase();
        const price = parseFloat(item.c);
        const open = parseFloat(item.o);
        const high = parseFloat(item.h);
        const low = parseFloat(item.l);
        const volume = parseFloat(item.q); // quote volume in USD

        const changePct = open > 0 ? ((price - open) / open) * 100 : 0;

        const prevPrice = prevPricesRef.current[baseSymbol];

        if (prevPrice !== undefined && prevPrice !== price) {
          const direction = price > prevPrice ? 'up' : 'down';
          newFlashes[baseSymbol] = direction;

          // Clear previous timeout if any
          if (flashTimeoutsRef.current[baseSymbol]) {
            clearTimeout(flashTimeoutsRef.current[baseSymbol]);
          }

          flashTimeoutsRef.current[baseSymbol] = setTimeout(() => {
            setFlashMap((prev) => {
              const next = { ...prev };
              delete next[baseSymbol];
              return next;
            });
          }, 800);
        }

        prevPricesRef.current[baseSymbol] = price;
        newUpdates[baseSymbol] = {
          price,
          changePct,
          high,
          low,
          volume,
          updatedAt: Date.now(),
        };
      }

      setTickerUpdates((prev) => ({ ...prev, ...newUpdates }));
      if (Object.keys(newFlashes).length > 0) {
        setFlashMap((prev) => ({ ...prev, ...newFlashes }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (!isLive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setIsConnected(true);
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            // Reconnect after 3 seconds
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (err) {
        console.warn('Binance WebSocket connect error:', err);
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    connect();

    const currentFlashTimeouts = flashTimeoutsRef.current;

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      Object.values(currentFlashTimeouts).forEach(clearTimeout);
    };
  }, [isLive, handleMessage]);

  const toggleLive = () => setIsLive((prev) => !prev);

  return {
    isConnected,
    isLive,
    toggleLive,
    tickerUpdates,
    flashMap,
  };
}

import React, { useState } from 'react';

const CoinIcon = ({ src, name, symbol, size = 40, className = '' }) => {
  const [failed, setFailed] = useState(!src);
  const dim = `${size}px`;
  const label = (symbol || name || '?').slice(0, 2).toUpperCase();

  if (failed) {
    return (
      <div
        className={`flex-shrink-0 rounded-full bg-gradient-to-br from-amber-500/80 to-violet-600/80 flex items-center justify-center text-xs font-bold text-white shadow-inner ${className}`}
        style={{ width: dim, height: dim }}
        title={name}
        aria-hidden
      >
        {label}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`flex-shrink-0 rounded-full bg-gray-700 object-cover ring-1 ring-white/10 ${className}`}
      onError={() => setFailed(true)}
    />
  );
};

export default CoinIcon;

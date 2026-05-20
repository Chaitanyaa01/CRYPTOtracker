import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CoinChart = ({ historicalData, coinName, coinImage }) => {
  if (!historicalData || historicalData.length === 0) {
    return <div className="text-white text-center">No historical data available for {coinName}.</div>;
  }

  const data = {
    labels: historicalData.map((data) => new Date(data.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: `${coinName} Price (USD)`,
        data: historicalData.map((data) => data.price_usd),
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'white',
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'white',
          callback: function (value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value);
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  return (
    <div className="bg-gray-800/90 border border-gray-700 p-4 rounded-xl mt-8 shadow-xl shadow-black/40">
      <div className="flex items-center gap-3 mb-4">
        {coinImage ? (
          <img src={coinImage} alt="" className="w-10 h-10 rounded-full bg-gray-700 object-cover ring-2 ring-amber-500/30" />
        ) : null}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Price history</p>
          <p className="text-lg font-semibold text-white">{coinName}</p>
        </div>
      </div>
      <Line data={data} options={options} />
    </div>
  );
};

export default CoinChart;

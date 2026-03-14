'use client';
import { useRef, useEffect } from 'react';

// Generic Chart.js wrapper — loads chart types (line, bar, doughnut)
// Chart.js is loaded via CDN in layout.jsx

const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9b9b96' } },
    y: { grid: { color: '#e8e8e5' }, ticks: { font: { size: 10 }, color: '#9b9b96' }, beginAtZero: true },
  },
};

export function LineChart({ id, labels, data, color }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined' || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          fill: true,
          borderColor: color,
          backgroundColor: color + '18',
          borderWidth: 1.5,
          pointBackgroundColor: color,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.4,
        }],
      },
      options: baseOpts,
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, data, color]);

  return <canvas ref={canvasRef} id={id} />;
}

export function BarChart({ id, labels, data, colors }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined' || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        ...baseOpts,
        scales: {
          ...baseOpts.scales,
          x: { ...baseOpts.scales.x, ticks: { font: { size: 10 }, color: '#9b9b96', maxRotation: 40 } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, data, colors]);

  return <canvas ref={canvasRef} id={id} />;
}

export function DoughnutChart({ id, labels, data, colors }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined' || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, data, colors]);

  return <canvas ref={canvasRef} id={id} />;
}

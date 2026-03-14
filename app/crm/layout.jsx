import Script from 'next/script';
import './pulse.css';

export const metadata = {
  title: 'Pulse — Command Center',
  description: 'Your full operations at a glance',
};

export default function CrmLayout({ children }) {
  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      {/* Chart.js CDN */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}

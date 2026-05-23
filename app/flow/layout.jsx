import { Outfit, Source_Sans_3 } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-display' });
const source = Source_Sans_3({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });

export const metadata = {
  title: 'FlowOS — GTD System',
  description: 'Your trusted external brain. Capture everything, clarify into actions, execute without emotion.',
};

export default function FlowLayout({ children }) {
  return (
    <div className={`${outfit.variable} ${source.variable}`} style={{
      background: '#0F0F0F',
      minHeight: '100vh',
      color: '#E6E1E5',
    }}>
      {children}
    </div>
  );
}

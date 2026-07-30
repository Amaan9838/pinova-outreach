import './globals.css'
import { Toaster } from "../components/ui/sonner";
import { League_Spartan, Playfair_Display, Inter } from "next/font/google";
import { GlobalLayoutWrapper } from "../components/GlobalLayoutWrapper";

const leagueSpartan = League_Spartan({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-league-spartan' })
const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-playfair-display' })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter' })

export const metadata = {
  title: 'Pinova Mail System',
  description: 'Elite cold outreach at scale with personalization and deliverability',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${leagueSpartan.variable} ${playfairDisplay.variable} ${inter.variable} font-sans`}>
        <GlobalLayoutWrapper>
          {children}
        </GlobalLayoutWrapper>
        <Toaster />
      </body>
    </html>
  )
}

import './globals.css'
import { Toaster } from "../components/ui/sonner";
import {League_Spartan} from "next/font/google";
import { GlobalLayoutWrapper } from "../components/GlobalLayoutWrapper";

const leagueSpartan = League_Spartan({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-league-spartan' })
export const metadata = {
  title: 'Pinova Mail System',
  description: 'Elite cold outreach at scale with personalization and deliverability',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${leagueSpartan.variable} font-sans`}>
        <GlobalLayoutWrapper>
          {children}
        </GlobalLayoutWrapper>
        <Toaster />
      </body>
    </html>
  )
}

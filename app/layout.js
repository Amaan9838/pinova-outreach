import './globals.css'
import { AppSidebar } from "../components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../components/ui/sidebar";
import { Separator } from "../components/ui/separator";
import { Toaster } from "../components/ui/sonner";
import {League_Spartan} from "next/font/google";
const leagueSpartan = League_Spartan({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-league-spartan' })
export const metadata = {
  title: 'Pinova Mail System',
  description: 'Elite cold outreach at scale with personalization and deliverability',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${leagueSpartan.variable} font-sans`}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 items-center gap-2 px-4 border-b bg-white">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <h1 className="text-2xl font-semibold text-gray-800 font-league-spartan">Pinova.</h1>
            </header>
            <main className="min-h-screen bg-gray-50 p-4">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  )
}

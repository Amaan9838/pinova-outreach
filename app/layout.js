import './globals.css'

export const metadata = {
  title: 'Pinova Mail System',
  description: 'Elite cold outreach at scale with personalization and deliverability',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <h1 className="text-xl font-bold text-gray-900">Pinova Mail</h1>
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                    <a href="/dashboard" className="nav-link">Dashboard</a>
                    <a href="/campaigns" className="nav-link">Campaigns</a>
                    <a href="/prospects" className="nav-link">Prospects</a>
                    <a href="/emails" className="nav-link">Emails</a>
                    <a href="/mailboxes" className="nav-link">Mailboxes</a>
                    <a href="/compose" className="nav-link">Compose</a>

                    <a href="/debug" className="nav-link text-red-600">Debug</a>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

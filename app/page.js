import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Pinova Mail System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Elite cold outreach at scale with personalization and deliverability
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Link href="/campaigns" className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaigns</h3>
            <p className="text-gray-600">Create and manage your outreach campaigns with advanced sequencing</p>
          </Link>
          
          <Link href="/prospects" className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Prospects</h3>
            <p className="text-gray-600">Import and manage your prospect lists with smart segmentation</p>
          </Link>
          
          <Link href="/mailboxes" className="card hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mailboxes</h3>
            <p className="text-gray-600">Configure sending mailboxes with warm-up and reputation management</p>
          </Link>
        </div>
        
        <div className="mt-8">
          <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

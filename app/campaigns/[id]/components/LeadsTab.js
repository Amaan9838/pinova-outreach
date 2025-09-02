'use client';

export default function LeadsTab({ campaign, getStatusColor }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Prospects</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prospect</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Step</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Send</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaign.prospects?.map((prospectData, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {prospectData.prospectId?.firstName} {prospectData.prospectId?.lastName}
                  <div className="text-xs text-gray-500">{prospectData.prospectId?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{prospectData.currentStep}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospectData.status)}`}>{prospectData.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prospectData.nextSendAt ? new Date(prospectData.nextSendAt).toLocaleString() : 'Not scheduled'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

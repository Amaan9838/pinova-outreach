// Utility functions for campaign management

export const getStatusColor = (status) => {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-100';
    case 'paused': return 'text-yellow-600 bg-yellow-100';
    case 'completed': return 'text-blue-600 bg-blue-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export const getMessageStatusColor = (status) => {
  switch (status) {
    case 'sent': return 'text-green-600 bg-green-100';
    case 'delivered': return 'text-blue-600 bg-blue-100';
    case 'opened': return 'text-purple-600 bg-purple-100';
    case 'replied': return 'text-indigo-600 bg-indigo-100';
    case 'bounced': return 'text-red-600 bg-red-100';
    case 'failed': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export const computeDailySeries = (msgs) => {
  // last 7 days including today
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0,0,0,0);
    return d;
  });
  const key = (d) => d.toISOString().slice(0,10);
  const map = new Map(days.map(d => [key(d), { date: new Date(d), sent: 0, opened: 0, replied: 0 }]));

  for (const m of msgs) {
    const created = m.createdAt ? new Date(m.createdAt) : null;
    if (created) {
      const k = key(new Date(created.getFullYear(), created.getMonth(), created.getDate()));
      if (map.has(k)) {
        map.get(k).sent += 1;
      }
    }
    if (m.events) {
      for (const e of m.events) {
        const ed = e.timestamp ? new Date(e.timestamp) : null;
        if (!ed) continue;
        const kk = key(new Date(ed.getFullYear(), ed.getMonth(), ed.getDate()));
        if (!map.has(kk)) continue;
        if (e.type === 'opened') map.get(kk).opened += 1;
        if (e.type === 'replied') map.get(kk).replied += 1;
      }
    }
  }
  return Array.from(map.values()).map(r => ({
    label: r.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    sent: r.sent,
    opened: r.opened,
    replied: r.replied,
  }));
};

export const computeMessageStats = (messages) => {
  const sentCount = messages.filter(m => ['sent','delivered','opened','replied'].includes(m.status)).length;
  const openedCount = messages.filter(m => m.status === 'opened' || (m.events && m.events.some(e => e.type === 'opened'))).length;
  const deliveredCount = messages.filter(m => m.status === 'delivered' || (m.events && m.events.some(e => e.type === 'delivered'))).length;
  const repliedCount = messages.filter(m => m.status === 'replied' || (m.events && m.events.some(e => e.type === 'replied'))).length;
  
  return {
    sentCount,
    openedCount,
    deliveredCount,
    repliedCount
  };
};

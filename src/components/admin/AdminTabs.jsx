export default function AdminTabs({ activeTab, onTabChange, counts }) {
  const tabs = [
    { id: 'bookings', label: 'Live Bookings', icon: '📅', badge: counts.bookings, live: true },
    { id: 'free', label: 'Free Session Requests', icon: '💡', badge: counts.free },
    { id: 'mentors', label: 'Mentors', icon: '👤', badge: counts.mentors },
    { id: 'approvals', label: 'Approvals', icon: '⏳', badge: counts.approvals, red: true },
    { id: 'students', label: 'Students', icon: '🎓', badge: counts.students }
  ];

  return (
    <div className="adm-tabs bg-white border-b border-gray-200 flex px-7 gap-1 overflow-x-auto shadow-sm">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`adm-tab flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition ${
            activeTab === tab.id
              ? 'text-indigo-600 border-indigo-600 font-black'
              : 'text-gray-500 border-transparent hover:text-gray-900'
          }`}
        >
          {tab.live && <span className="live-dot w-2 h-2 rounded-full bg-green-500 shadow-lg animate-pulse"></span>}
          {!tab.live && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
          <span
            className={`tab-badge px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : tab.red
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {tab.badge}
          </span>
        </button>
      ))}
    </div>
  );
}
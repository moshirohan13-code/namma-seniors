export default function AdminStats({ totalBookings, activeMentors, revenue, payouts }) {
  const stats = [
    { icon: '📅', label: 'Total Bookings', value: totalBookings, gradient: 'from-indigo-600 to-purple-600' },
    { icon: '👤', label: 'Active Mentors', value: activeMentors, gradient: 'from-indigo-700 to-blue-600' },
    { icon: '₹', label: 'Revenue', value: `₹${revenue}`, gradient: 'from-green-500 to-emerald-600' },
    { icon: '💸', label: 'Payouts Due', value: `₹${payouts}`, gradient: 'from-purple-600 to-indigo-700' }
  ];

  return (
    <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="stat-card bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition flex items-center gap-3"
        >
          <div
            className={`stat-icon w-9 h-9 rounded-lg bg-gradient-to-br ${stat.gradient} text-white flex items-center justify-center text-[15px] flex-shrink-0`}
          >
            {stat.icon}
          </div>
          <div>
            <div className="stat-label text-[10.5px] text-gray-500 font-bold tracking-wide mb-0.5">
              {stat.label}
            </div>
            <div className="stat-value text-[22px] font-black text-gray-900 leading-none tracking-tight">
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
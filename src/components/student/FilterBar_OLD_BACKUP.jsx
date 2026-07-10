import { useState, useEffect } from 'react';

export default function FilterBar({
  searchQuery,
  onSearchChange,
  examFilter,
  onExamChange,
  rankFilter,
  onRankChange,
  onClearFilters,
  showFilterDrawer,
  onToggleDrawer,
  onCloseDrawer,
  mentorCount
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="controls-section max-w-6xl mx-auto px-6 pt-6">
      {/* Search + Filter Toggle */}
      <div className="filter-bar flex items-center justify-center gap-2 w-full">
        {/* Search */}
        <div className="search-wrap relative flex-1 max-w-[580px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name, college…"
            className="w-full h-11 pl-10 pr-4 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition"
          />
        </div>

        {/* Filter Toggle Button (Mobile) */}
        <button
          onClick={onToggleDrawer}
          className="flex items-center justify-center gap-2 h-11 px-4 border-2 border-gray-200 rounded-xl bg-white text-gray-600 text-sm font-semibold hover:border-indigo-600 hover:text-indigo-600 transition"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <span>Filters</span>
        </button>
      </div>

      {/* Desktop Filters removed - now shown only in filter drawer */}

      {/* Filter Drawer (both mobile and desktop) */}
      <>
        {/* Backdrop */}
        {showFilterDrawer && (
          <div
            className="fixed inset-0 z-[899] bg-gray-900/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseDrawer}
          />
        )}

        {/* Filter Panel - shows as bottom sheet on mobile, centered dropdown on desktop */}
        <div
          className={`fixed z-[900] bg-white rounded-2xl shadow-2xl p-4 transition-all duration-300 ${showFilterDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            } 
    /* Mobile: bottom sheet */
    bottom-0 left-0 right-0 rounded-t-3xl md:rounded-2xl
    /* Desktop: dropdown below search bar */
    md:absolute md:top-full md:left-0 md:right-0 md:mt-2 md:max-w-2xl md:mx-auto
    `}
          style={{ maxHeight: '58vh', overflowY: 'auto' }}
        >
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-gray-100 mb-4">
            <div>
              <strong className="block text-lg text-gray-900 tracking-tight">Filters</strong>
              <span className="block text-xs text-gray-500 mt-0.5">Refine mentors</span>
            </div>
            <button
              onClick={onClearFilters}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold"
            >
              Clear All
            </button>
          </div>

          {/* Exam Filter Pills */}
          <div className="mb-5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-3">
              Exam Category
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['All', 'JEE', 'NEET', 'KCET', 'COMEDK'].map(exam => (
                <button
                  key={exam}
                  onClick={() => onExamChange(exam)}
                  className={`min-h-[42px] px-3 rounded-full text-xs font-bold border-2 transition ${examFilter === exam
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg'
                    : 'bg-white text-gray-700 border-gray-200'
                    }`}
                >
                  {exam === 'All' ? 'All Exams' : exam}
                </button>
              ))}
            </div>
          </div>

          {/* Rank Filter Pills */}
          <div className="mb-5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-3">
              Rank Range
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'All Ranks', value: '' },
                { label: 'Top 1K', value: '0-1000' },
                { label: '1K-10K', value: '1000-10000' },
                { label: '10K-50K', value: '10000-50000' },
                { label: '50K+', value: '50000-999999' }
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => onRankChange(value)}
                  className={`min-h-[42px] px-3 rounded-full text-xs font-bold border-2 transition ${rankFilter === value
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg'
                    : 'bg-white text-gray-700 border-gray-200'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={onCloseDrawer}
            className="w-full max-w-md mx-auto block min-h-[46px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-extrabold text-sm shadow-xl"
          >
            Apply Filters
          </button>
        </div>
      </>

      {/* Count */}
      <div className="mt-4 text-sm text-gray-500">
        Showing <strong className="text-gray-900 font-bold">{mentorCount}</strong> verified mentors
      </div>
    </div>
  );
}
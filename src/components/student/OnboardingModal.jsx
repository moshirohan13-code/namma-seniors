import { useState } from 'react';
import { sbUpload, sbFetch } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';

export default function OnboardingModal({ studentSession, onClose, showToast }) {
  // Details that come from the student's login (no need to type again)
  const sessionName = String(studentSession?.name || studentSession?.full_name || '').trim();
  const sessionEmail = String(studentSession?.email || '').trim();
  const sessionPhone = String(studentSession?.phone || '').replace(/\D/g, '').slice(-10);

  const [formData, setFormData] = useState({
    name: sessionName,
    college: '',
    degree: '',
    branch: '',
    phone: sessionPhone,
    languages: '',
    home_location: '',
    career_help: '',
    youtube_link: '',
    instagram_link: ''
  });

  // ── Placement status (NEW) ──
  const [isPlaced, setIsPlaced] = useState(false); // false = Not placed, true = Placed
  const [placement, setPlacement] = useState({
    company: '',
    role: '',
    experience_level: '', // 'fresher' | 'experienced'
    years_experience: ''
  });

  const [selectedExams, setSelectedExams] = useState(new Set());
  const [ranks, setRanks] = useState({
    jee: '',
    jeeadv: '',
    neet_air: '',
    neet_marks: '',
    kcet: '',
    comedk: ''
  });

  const [idFile, setIdFile] = useState(null);
  const [idFileName, setIdFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // What the senior earns per completed session (placed seniors earn more)
  const earnPerSession = isPlaced ? CONFIG.PLACEMENT_MENTOR_PAYOUT : CONFIG.MENTOR_PAYOUT;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlacementChange = (field, value) => {
    setPlacement(prev => ({ ...prev, [field]: value }));
  };

  const handleRankChange = (field, value) => {
    setRanks(prev => ({ ...prev, [field]: value }));
  };

  const toggleExam = exam => {
    const newSet = new Set(selectedExams);
    if (newSet.has(exam)) {
      newSet.delete(exam);
    } else {
      newSet.add(exam);
    }
    setSelectedExams(newSet);
  };

  const handleIdFileChange = e => {
    const file = e.target.files[0];
    if (file) {
      setIdFile(file);
      setIdFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) return showToast('⚠️ Enter your full name.');
    if (!sessionEmail) return showToast('⚠️ Please log in again to continue.');
    if (!formData.college) return showToast('⚠️ Enter college name.');
    if (!formData.degree) return showToast('⚠️ Select degree.');
    if (!formData.branch) return showToast('⚠️ Enter branch.');

    if (isPlaced) {
      if (!placement.company.trim()) return showToast('⚠️ Enter the company you got placed in.');
      if (!placement.role.trim()) return showToast('⚠️ Enter your role.');
      if (!placement.experience_level) return showToast('⚠️ Select Fresher or Has Experience.');
      if (placement.experience_level === 'experienced') {
        const yrs = parseFloat(placement.years_experience);
        if (!yrs || yrs <= 0 || yrs > 40) return showToast('⚠️ Enter how many years of experience you have.');
      }
    } else {
      if (!selectedExams.size) return showToast('⚠️ Select at least one exam.');
    }

    if (!/^\d{10}$/.test(formData.phone)) return showToast('⚠️ Your login has no valid 10-digit mobile number. Please log in again.');
    if (!idFile) return showToast('⚠️ Upload college ID card.');
    if (formData.youtube_link && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(formData.youtube_link.trim())) {
      return showToast('⚠️ Enter a valid YouTube link (must start with https://youtube.com or https://youtu.be).');
    }
    if (formData.instagram_link && !/^https:\/\/(www\.)?instagram\.com\//i.test(formData.instagram_link.trim())) {
      return showToast('⚠️ Enter a valid Instagram link (must start with https://instagram.com).');
    }

    setSubmitting(true);

    try {
      // Upload ID card
      let idCardUrl = '';
      try {
        const ext = idFile.name.split('.').pop();
        idCardUrl = await sbUpload(
          'mentor-ids',
          `${Date.now()}_${formData.name.replace(/\s+/g, '_')}.${ext}`,
          idFile
        );
      } catch (e) {
        console.warn('[ID upload]', e);
      }

      // Build payload
      const payload = {
        full_name: formData.name.trim(),
        email: sessionEmail.toLowerCase(),
        college: formData.college,
        degree: formData.degree,
        branch: formData.branch,
        phone: formData.phone,
        languages: formData.languages,
        home_location: formData.home_location,
        can_help_with: formData.career_help,
        youtube_link: formData.youtube_link.trim(),
        instagram_link: formData.instagram_link.trim(),
        id_card_url: idCardUrl,
        status: 'pending',
        payout_per_session: earnPerSession,
        created_at: new Date().toISOString()
      };

      if (isPlaced) {
        // Placed seniors show up under the Placement button
        payload.category = 'placement';
        payload.company = placement.company.trim();
        payload.role = placement.role.trim();
        payload.experience_level = placement.experience_level;
        payload.years_experience =
          placement.experience_level === 'experienced' ? parseFloat(placement.years_experience) : null;
        payload.exam_profile = '';
      } else {
        payload.category = 'entrance';
        payload.exam_profile = [...selectedExams].join(', ');

        // Add ranks
        if (selectedExams.has('JEE Main') && ranks.jee) payload.jee_rank = parseInt(ranks.jee);
        if (selectedExams.has('JEE Advanced') && ranks.jeeadv) payload.jee_adv_rank = parseInt(ranks.jeeadv);
        if (selectedExams.has('NEET')) {
          if (ranks.neet_air) payload.neet_rank = parseInt(ranks.neet_air);
          if (ranks.neet_marks) payload.neet_marks = Math.min(parseInt(ranks.neet_marks), 720);
        }
        if (selectedExams.has('KCET') && ranks.kcet) payload.kcet_rank = parseInt(ranks.kcet);
        if (selectedExams.has('COMEDK') && ranks.comedk) payload.comedk_rank = parseInt(ranks.comedk);
      }

      await sbFetch('mentor_applications', { method: 'POST', body: payload, prefer: 'return=minimal' });

      onClose();
      showToast('✅ Application submitted! Opening WhatsApp…');

      const mentorWaMsg = `Hey! I've just submitted my senior mentor application on Namma Seniors. I'm excited to help juniors and would be happy to assist! Please let me know the next steps.`;
      setTimeout(
        () =>
          window.open(
            `https://wa.me/${CONFIG.WHATSAPP_SUPPORT}?text=${encodeURIComponent(mentorWaMsg)}`,
            '_blank'
          ),
        600
      );
    } catch (e) {
      console.error('[Onboarding]', e);
      showToast('❌ Submission failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100';
  const labelCls = 'ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider';

  return (
    <div className="onboarding-overlay fixed inset-0 z-[800] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="onboarding-modal w-full max-w-lg max-h-[93vh] overflow-hidden bg-white rounded-3xl shadow-2xl animate-fadeUp flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ob-header relative text-white bg-gradient-to-r from-indigo-600 to-purple-600 py-5 px-6 rounded-t-3xl flex-shrink-0">
          <button
            onClick={onClose}
            className="m-close absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
          <div className="ob-tag text-[9px] font-bold uppercase tracking-widest text-indigo-200 mb-1">
            Senior Onboarding
          </div>
          <h3 className="text-lg font-bold">Register as a Mentor</h3>
        </div>

        {/* Body - Scrollable */}
        <div className="ob-body overflow-y-auto flex-1 p-5">
          {/* Account details (from login, locked) */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 mb-3">
              🔒 Your Account
            </div>

            <div className="ob-f-group mb-3">
              <label className={labelCls}>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                readOnly={!!sessionName}
                placeholder="Your full name"
                className={`${inputCls} ${sessionName ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="ob-f-group mb-3">
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={sessionEmail}
                readOnly
                className={`${inputCls} bg-gray-100 text-gray-600 cursor-not-allowed`}
              />
            </div>

            <div className="ob-f-group">
              <label className={labelCls}>Mobile Number</label>
              <input
                type="tel"
                value={formData.phone}
                readOnly
                className={`${inputCls} bg-gray-100 text-gray-600 cursor-not-allowed`}
              />
            </div>
          </div>

          {/* College */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>College Name</label>
            <input
              type="text"
              value={formData.college}
              onChange={e => handleInputChange('college', e.target.value)}
              placeholder="e.g., NITK Surathkal"
              className={inputCls}
            />
          </div>

          {/* Degree */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>Degree</label>
            <select
              value={formData.degree}
              onChange={e => handleInputChange('degree', e.target.value)}
              className="ob-f-select w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 cursor-pointer bg-white"
            >
              <option value="">Select degree</option>
              <option>B.Tech</option>
              <option>B.E.</option>
              <option>MBBS</option>
              <option>BDS</option>
              <option>B.Sc</option>
              <option>B.Pharm</option>
              <option>Other</option>
            </select>
          </div>

          {/* Branch */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>Branch</label>
            <input
              type="text"
              value={formData.branch}
              onChange={e => handleInputChange('branch', e.target.value)}
              placeholder="e.g., Mechanical Engineering"
              className={inputCls}
            />
          </div>

          {/* ── Placement status (NEW) ── */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>Placement Status</label>
            <div className="flex gap-2">
              {[
                { value: false, label: 'Not Placed' },
                { value: true, label: 'Placed' }
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setIsPlaced(opt.value)}
                  className={`flex-1 px-3 py-3 rounded-xl border-2 text-sm font-bold transition ${isPlaced === opt.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* PLACED → company, role, fresher / newly joined */}
          {isPlaced && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
              <div className="text-[10px] font-bold text-amber-700 mb-3">💼 Placement Details</div>

              <div className="ob-f-group mb-3">
                <label className={labelCls}>Company</label>
                <input
                  type="text"
                  value={placement.company}
                  onChange={e => handlePlacementChange('company', e.target.value)}
                  placeholder="e.g., Google, Amazon, TCS"
                  className={inputCls}
                />
              </div>

              <div className="ob-f-group mb-3">
                <label className={labelCls}>Role</label>
                <input
                  type="text"
                  value={placement.role}
                  onChange={e => handlePlacementChange('role', e.target.value)}
                  placeholder="e.g., Software Engineer"
                  className={inputCls}
                />
              </div>

              <div className="ob-f-group">
                <label className={labelCls}>Current Status</label>
                <div className="flex gap-2">
                  {[
                    { value: 'fresher', label: 'Fresher' },
                    { value: 'experienced', label: 'Has Experience' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handlePlacementChange('experience_level', opt.value);
                        if (opt.value === 'fresher') handlePlacementChange('years_experience', '');
                      }}
                      className={`flex-1 px-3 py-3 rounded-xl border-2 text-sm font-bold transition ${placement.experience_level === opt.value
                        ? 'border-amber-500 bg-white text-amber-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {placement.experience_level === 'experienced' && (
                <div className="ob-f-group mt-3">
                  <label className={labelCls}>How many years of experience do you have?</label>
                  <input
                    type="number"
                    min="0.5"
                    max="40"
                    step="0.5"
                    value={placement.years_experience}
                    onChange={e => handlePlacementChange('years_experience', e.target.value)}
                    placeholder="e.g., 2 or 1.5"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          )}

          {/* NOT PLACED → exams + ranks (same as before) */}
          {!isPlaced && (
            <>
              {/* Exams Qualified */}
              <div className="ob-f-group mb-3">
                <label className={labelCls}>Exams Qualified</label>
                <div className="exam-chip-wrap flex flex-wrap gap-1">
                  {['JEE Main', 'JEE Advanced', 'NEET', 'KCET', 'COMEDK'].map(exam => (
                    <button
                      key={exam}
                      type="button"
                      onClick={() => toggleExam(exam)}
                      className={`ob-exam-chip px-3 py-2 rounded-full border text-xs font-semibold transition ${selectedExams.has(exam)
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                        : 'border-gray-200 bg-white text-gray-600'
                        }`}
                    >
                      {exam}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rank Fields (Dynamic) */}
              <div id="ob_rankFields">
                {selectedExams.has('JEE Main') && (
                  <div className="rank-group-box bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                    <div className="rank-group-title text-[10px] font-bold text-indigo-600 mb-2">📐 JEE Main – AIR</div>
                    <input
                      type="number"
                      min="1"
                      value={ranks.jee}
                      onChange={e => handleRankChange('jee', e.target.value)}
                      placeholder="e.g., 15000"
                      className="ob-f-input w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600"
                    />
                  </div>
                )}

                {selectedExams.has('JEE Advanced') && (
                  <div className="rank-group-box bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                    <div className="rank-group-title text-[10px] font-bold text-indigo-600 mb-2">
                      🏆 JEE Advanced – AIR
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={ranks.jeeadv}
                      onChange={e => handleRankChange('jeeadv', e.target.value)}
                      placeholder="e.g., 5000"
                      className="ob-f-input w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600"
                    />
                  </div>
                )}

                {selectedExams.has('NEET') && (
                  <div className="rank-group-box bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                    <div className="rank-group-title text-[10px] font-bold text-indigo-600 mb-2">🩺 NEET</div>
                    <div className="rank-row-2 flex gap-2">
                      <div className="ob-f-group flex-1">
                        <label className="ob-f-label block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          AIR
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={ranks.neet_air}
                          onChange={e => handleRankChange('neet_air', e.target.value)}
                          placeholder="20000"
                          className="ob-f-input w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="ob-f-group flex-1">
                        <label className="ob-f-label block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Marks /720
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="720"
                          value={ranks.neet_marks}
                          onChange={e => {
                            const val = Math.min(Number(e.target.value), 720);
                            handleRankChange('neet_marks', String(val));
                          }}
                          placeholder="620"
                          className="ob-f-input w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedExams.has('KCET') && (
                  <div className="rank-group-box bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                    <div className="rank-group-title text-[10px] font-bold text-indigo-600 mb-2">
                      📋 KCET – State Rank
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={ranks.kcet}
                      onChange={e => handleRankChange('kcet', e.target.value)}
                      placeholder="e.g., 512"
                      className="ob-f-input w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600"
                    />
                  </div>
                )}

                {selectedExams.has('COMEDK') && (
                  <div className="rank-group-box bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                    <div className="rank-group-title text-[10px] font-bold text-indigo-600 mb-2">
                      🎓 COMEDK – State Rank
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={ranks.comedk}
                      onChange={e => handleRankChange('comedk', e.target.value)}
                      placeholder="e.g., 430"
                      className="ob-f-input w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Languages */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>Languages Known</label>
            <input
              type="text"
              value={formData.languages}
              onChange={e => handleInputChange('languages', e.target.value)}
              placeholder="e.g., Kannada, Hindi, English"
              className={inputCls}
            />
          </div>

          {/* Home Location */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>Home Location</label>
            <input
              type="text"
              value={formData.home_location}
              onChange={e => handleInputChange('home_location', e.target.value)}
              placeholder="e.g., Belagavi, Karnataka"
              className={inputCls}
            />
          </div>

          {/* Career Help (Optional) */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>
              Internships/Placements offered or guidance in{' '}
              <span className="normal-case tracking-normal text-gray-400">(Optional)</span>
            </label>
            <textarea
              value={formData.career_help}
              onChange={e => handleInputChange('career_help', e.target.value)}
              placeholder="e.g., Google, Amazon, internship preparation, resume reviews, placement interviews"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 min-h-[88px] resize-vertical"
            />
          </div>

          {/* YouTube Link (Optional) */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>
              YouTube Channel Link <span className="normal-case tracking-normal text-gray-400">(Optional)</span>
            </label>
            <input
              type="url"
              value={formData.youtube_link}
              onChange={e => handleInputChange('youtube_link', e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
              className={inputCls}
            />
          </div>

          {/* Instagram Link (Optional) */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>
              Instagram Link <span className="normal-case tracking-normal text-gray-400">(Optional)</span>
            </label>
            <input
              type="url"
              value={formData.instagram_link}
              onChange={e => handleInputChange('instagram_link', e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              className={inputCls}
            />
          </div>

          {/* Info Box */}
          <div className="ob-info blue flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 mb-3 text-xs leading-relaxed">
            <span>🌐</span>
            <div>Sessions are 20-25 min 1:1 Google Meet calls. You'll earn ₹{earnPerSession} per session.</div>
          </div>

          {/* Upload College ID */}
          <div className="ob-f-group mb-3">
            <label className={labelCls}>
              Upload College ID <span className="text-red-500">*</span>
            </label>
            <label
              htmlFor="ob_idcard"
              className={`ob-id-upload-btn w-full px-3 py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition ${idFileName
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-500 hover:border-indigo-400'
                }`}
            >
              <span className="text-sm">⬆</span>
              <span>{idFileName || 'Click to upload ID card (JPG/PNG/PDF)'}</span>
            </label>
            <input
              type="file"
              id="ob_idcard"
              accept="image/*,.pdf"
              onChange={handleIdFileChange}
              className="hidden"
            />
          </div>

          {/* Info Box */}
          <div className="ob-info purple flex gap-2 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 mb-3 text-xs leading-relaxed">
            <span>📋</span>
            <div>After approval, you'll be visible to students on Namma Seniors.</div>
          </div>

          {/* Earnings + panel link (shown to everyone) */}
          {(
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-3">
              <div className="text-sm font-extrabold text-green-800 mb-1">
                💰 Earn ₹{earnPerSession} for every session you complete
              </div>
              <p className="text-xs text-green-800 leading-relaxed mb-3">
                After we verify you, you can track your bookings, profile views and earnings anytime in your
                Mentor Panel.
              </p>
              <a
                href="/mentor-login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-green-700 underline"
              >
                Open Mentor Panel →
              </a>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="ob-submit-btn w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition"
          >
            {submitting ? 'Submitting…' : 'Submit Application →'}
          </button>
        </div>
      </div>
    </div>
  );
}
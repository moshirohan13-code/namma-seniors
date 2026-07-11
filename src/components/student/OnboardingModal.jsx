import { useState } from 'react';
import { sbUpload, sbFetch } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';

export default function OnboardingModal({ studentSession, onClose, showToast }) {
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    degree: '',
    year: '',
    branch: '',
    phone: studentSession?.phone || '',
    languages: '',
    home_location: '',
    career_help: '',
    youtube_link: '',
    instagram_link: ''
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    if (!formData.name) return showToast('⚠️ Enter full name.');
    if (!formData.college) return showToast('⚠️ Enter college name.');
    if (!formData.degree) return showToast('⚠️ Select degree.');
    if (!formData.year) return showToast('⚠️ Select year.');
    if (!formData.branch) return showToast('⚠️ Enter branch.');
    if (!selectedExams.size) return showToast('⚠️ Select at least one exam.');
    if (!/^\d{10}$/.test(formData.phone)) return showToast('⚠️ Enter valid 10-digit number.');
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
        full_name: formData.name,
        college: formData.college,
        degree: formData.degree,
        year: formData.year,
        branch: formData.branch,
        exam_profile: [...selectedExams].join(', '),
        phone: formData.phone,
        languages: formData.languages,
        home_location: formData.home_location,
        can_help_with: formData.career_help,
        youtube_link: formData.youtube_link.trim(),
        instagram_link: formData.instagram_link.trim(),
        id_card_url: idCardUrl,
        status: 'pending',
        payout_per_session: CONFIG.MENTOR_PAYOUT,
        created_at: new Date().toISOString()
      };

      // Add ranks
      if (selectedExams.has('JEE Main') && ranks.jee) payload.jee_rank = parseInt(ranks.jee);
      if (selectedExams.has('JEE Advanced') && ranks.jeeadv) payload.jee_adv_rank = parseInt(ranks.jeeadv);
      if (selectedExams.has('NEET')) {
        if (ranks.neet_air) payload.neet_rank = parseInt(ranks.neet_air);
        if (ranks.neet_marks) payload.neet_marks = Math.min(parseInt(ranks.neet_marks), 720);
      }
      if (selectedExams.has('KCET') && ranks.kcet) payload.kcet_rank = parseInt(ranks.kcet);
      if (selectedExams.has('COMEDK') && ranks.comedk) payload.comedk_rank = parseInt(ranks.comedk);

      await sbFetch('mentor_applications', { method: 'POST', body: payload });

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
          {/* Name */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="Your full name"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* College */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              College Name
            </label>
            <input
              type="text"
              value={formData.college}
              onChange={e => handleInputChange('college', e.target.value)}
              placeholder="e.g., NITK Surathkal"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* Degree */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Degree
            </label>
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

          {/* Academic Year */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Academic Year
            </label>
            <select
              value={formData.year}
              onChange={e => handleInputChange('year', e.target.value)}
              className="ob-f-select w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 cursor-pointer bg-white"
            >
              <option value="">Select year</option>
              <option>1st Year</option>
              <option>2nd Year</option>
              <option>3rd Year</option>
              <option>4th Year</option>
              <option>5th Year</option>
            </select>
          </div>

          {/* Branch */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Branch
            </label>
            <input
              type="text"
              value={formData.branch}
              onChange={e => handleInputChange('branch', e.target.value)}
              placeholder="e.g., Mechanical Engineering"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* Exams Qualified */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Exams Qualified
            </label>
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

          {/* WhatsApp Number */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => handleInputChange('phone', e.target.value)}
              placeholder="10-digit number"
              maxLength="10"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* Languages */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Languages Known
            </label>
            <input
              type="text"
              value={formData.languages}
              onChange={e => handleInputChange('languages', e.target.value)}
              placeholder="e.g., Kannada, Hindi, English"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* Home Location */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Home Location
            </label>
            <input
              type="text"
              value={formData.home_location}
              onChange={e => handleInputChange('home_location', e.target.value)}
              placeholder="e.g., Belagavi, Karnataka"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* Career Help (Optional) */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
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
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              YouTube Channel Link <span className="normal-case tracking-normal text-gray-400">(Optional)</span>
            </label>
            <input
              type="url"
              value={formData.youtube_link}
              onChange={e => handleInputChange('youtube_link', e.target.value)}
              placeholder="https://youtube.com/@yourchannel"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* Instagram Link (Optional) */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Instagram Link <span className="normal-case tracking-normal text-gray-400">(Optional)</span>
            </label>
            <input
              type="url"
              value={formData.instagram_link}
              onChange={e => handleInputChange('instagram_link', e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              className="ob-f-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {/* Info Box */}
          <div className="ob-info blue flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 mb-3 text-xs leading-relaxed">
            <span>🌐</span>
            <div>Sessions are 20-25 min 1:1 Google Meet calls. You'll earn ₹{CONFIG.MENTOR_PAYOUT} per session.</div>
          </div>

          {/* Upload College ID */}
          <div className="ob-f-group mb-3">
            <label className="ob-f-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
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
            <div>After approval, you'll be visible to students and earn ₹{CONFIG.MENTOR_PAYOUT} per session.</div>
          </div>

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
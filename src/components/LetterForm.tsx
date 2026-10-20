import React, { useState, useEffect, useId } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  User,
  Heart
} from 'lucide-react';
import type { ConfirmedLetterData } from './ConfirmationCard';

interface LetterFormProps {
  onSuccess: (data: ConfirmedLetterData) => void;
}

const DRAFT_STORAGE_KEY = 'dear_tomorrow_draft_v1';

export const LetterForm: React.FC<LetterFormProps> = ({ onSuccess }) => {
  // Title & Content
  const [title, setTitle] = useState('');
  const [senderName, setSenderName] = useState('');
  const [content, setContent] = useState('');
  const [recipientType, setRecipientType] = useState<'self' | 'someone'>('self');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  // Date selection states
  // Default to 1 year in the future at 09:00 AM
  const now = new Date();
  const defaultFuture = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 9, 0);

  const [selectedYear, setSelectedYear] = useState<number>(defaultFuture.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultFuture.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number>(defaultFuture.getDate());
  const [deliveryHour, setDeliveryHour] = useState<number>(9);
  const [deliveryMinute, setDeliveryMinute] = useState<number>(0);
  const [deliveryPeriod, setDeliveryPeriod] = useState<'AM' | 'PM'>('AM');
  const [activePreset, setActivePreset] = useState<string>('1yr');

  // Typed input values allowing direct keyboard entry
  const [dayInput, setDayInput] = useState<string>(String(defaultFuture.getDate()));
  const [yearInput, setYearInput] = useState<string>(String(defaultFuture.getFullYear()));
  const [hourInput, setHourInput] = useState<string>('9');
  const [minuteInput, setMinuteInput] = useState<string>('00');

  // Status & Validation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);

  // Accessible IDs
  const titleId = useId();
  const senderNameId = useId();
  const contentId = useId();
  const emailId = useId();
  const recipientNameId = useId();

  // Load draft from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.content) setContent(parsed.content);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.senderName) setSenderName(parsed.senderName);
        if (parsed.recipientEmail) setRecipientEmail(parsed.recipientEmail);
        if (parsed.recipientName) setRecipientName(parsed.recipientName);
        if (parsed.recipientType) setRecipientType(parsed.recipientType);
        setDraftSavedTime('Restored from draft');
      }
    } catch (e) {
      console.warn('Could not load draft from local storage:', e);
    }
  }, []);

  // Auto-save draft on changes (debounced)
  useEffect(() => {
    if (!content && !title && !senderName) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            title,
            senderName,
            content,
            recipientEmail,
            recipientName,
            recipientType,
            updatedAt: new Date().toISOString(),
          })
        );
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setDraftSavedTime(`Draft saved at ${timeStr}`);
      } catch (e) {
        console.warn('Draft auto-save error:', e);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, senderName, content, recipientEmail, recipientName, recipientType]);

  const handleClearDraft = () => {
    if (window.confirm('Would you like to clear your current draft and begin on a fresh parchment?')) {
      setContent('');
      setTitle('');
      setSenderName('');
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraftSavedTime(null);
    }
  };

  // Helper to calculate days in selected month/year
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const maxDays = getDaysInMonth(selectedYear, selectedMonth);

  // Keep day valid if month changes to one with fewer days
  useEffect(() => {
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
      setDayInput(String(maxDays));
    }
  }, [selectedYear, selectedMonth, maxDays, selectedDay]);

  // Synchronize string inputs when presets or state changes
  useEffect(() => {
    setDayInput(String(selectedDay));
  }, [selectedDay]);

  useEffect(() => {
    setYearInput(String(selectedYear));
  }, [selectedYear]);

  useEffect(() => {
    setHourInput(String(deliveryHour));
  }, [deliveryHour]);

  useEffect(() => {
    setMinuteInput(deliveryMinute < 10 ? `0${deliveryMinute}` : String(deliveryMinute));
  }, [deliveryMinute]);

  // Handlers for typing numbers
  const handleDayInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDayInput(val);
    setActivePreset('custom');
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= maxDays) {
      setSelectedDay(num);
    }
  };

  const handleDayBlur = () => {
    const num = parseInt(dayInput, 10);
    if (isNaN(num) || num < 1) {
      setSelectedDay(1);
      setDayInput('1');
    } else if (num > maxDays) {
      setSelectedDay(maxDays);
      setDayInput(String(maxDays));
    } else {
      setSelectedDay(num);
      setDayInput(String(num));
    }
  };

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYearInput(val);
    setActivePreset('custom');
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1900 && num <= 2150) {
      setSelectedYear(num);
    }
  };

  const handleYearBlur = () => {
    const num = parseInt(yearInput, 10);
    const minYear = now.getFullYear();
    if (isNaN(num) || num < minYear) {
      setSelectedYear(minYear);
      setYearInput(String(minYear));
    } else if (num > minYear + 100) {
      setSelectedYear(minYear + 100);
      setYearInput(String(minYear + 100));
    } else {
      setSelectedYear(num);
      setYearInput(String(num));
    }
  };

  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHourInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      setDeliveryHour(num);
    }
  };

  const handleHourBlur = () => {
    const num = parseInt(hourInput, 10);
    if (isNaN(num) || num < 1) {
      setDeliveryHour(1);
      setHourInput('1');
    } else if (num > 12) {
      setDeliveryHour(12);
      setHourInput('12');
    } else {
      setDeliveryHour(num);
      setHourInput(String(num));
    }
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinuteInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 59) {
      setDeliveryMinute(num);
    }
  };

  const handleMinuteBlur = () => {
    const num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0) {
      setDeliveryMinute(0);
      setMinuteInput('00');
    } else if (num > 59) {
      setDeliveryMinute(59);
      setMinuteInput('59');
    } else {
      setDeliveryMinute(num);
      setMinuteInput(num < 10 ? `0${num}` : String(num));
    }
  };

  // Construct target Date object
  const getTargetDate = (): Date => {
    let hour24 = deliveryHour % 12;
    if (deliveryPeriod === 'PM') hour24 += 12;

    return new Date(selectedYear, selectedMonth, selectedDay, hour24, deliveryMinute, 0);
  };

  const targetDate = getTargetDate();
  const currentDate = new Date();
  const isDateInPast = targetDate.getTime() < currentDate.getTime() - 60000;

  // Preset Date Handlers
  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const base = new Date();
    let newDate = new Date();

    switch (presetKey) {
      case 'today':
        newDate = new Date(base.getTime() + 2 * 60 * 1000); // 2 minutes from now
        const h24 = newDate.getHours();
        const p = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 || 12;
        setDeliveryHour(h12);
        setDeliveryMinute(newDate.getMinutes());
        setDeliveryPeriod(p);
        break;
      case '6mo':
        newDate = new Date(base.getFullYear(), base.getMonth() + 6, base.getDate());
        break;
      case '1yr':
        newDate = new Date(base.getFullYear() + 1, base.getMonth(), base.getDate());
        break;
      case '3yr':
        newDate = new Date(base.getFullYear() + 3, base.getMonth(), base.getDate());
        break;
      case '5yr':
        newDate = new Date(base.getFullYear() + 5, base.getMonth(), base.getDate());
        break;
      case '10yr':
        newDate = new Date(base.getFullYear() + 10, base.getMonth(), base.getDate());
        break;
      case 'newyear':
        newDate = new Date(base.getFullYear() + 1, 0, 1);
        break;
      default:
        return;
    }

    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth());
    setSelectedDay(newDate.getDate());
  };

  // Friendly formatted date string
  const formattedDeliveryDate = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedDeliveryTime = `${deliveryHour}:${deliveryMinute < 10 ? '0' : ''}${deliveryMinute} ${deliveryPeriod}`;

  // Time remaining calculation
  const diffTimeMs = targetDate.getTime() - currentDate.getTime();
  const diffDaysTotal = Math.floor(diffTimeMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDaysTotal / 365);
  const diffRemainingDays = diffDaysTotal % 365;

  let timeHorizonText = '';
  if (isDateInPast) {
    timeHorizonText = '⚠️ The chosen moment has already slipped into the past.';
  } else if (diffDaysTotal === 0) {
    timeHorizonText = 'Arrives today (within hours)';
  } else if (diffYears === 0) {
    timeHorizonText = `Arrives in ${diffDaysTotal} days`;
  } else {
    timeHorizonText = `Arrives in ${diffYears} ${diffYears === 1 ? 'year' : 'years'} and ${diffRemainingDays} ${diffRemainingDays === 1 ? 'day' : 'days'} (${diffDaysTotal} days total)`;
  }

  // Word and character count
  const wordCount = content.trim().length > 0 ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Prompts for inspiration
  const inspirationPrompts = [
    '🌿 What made you smile today?',
    '💫 What are you secretly hoping for?',
    '🌧️ A quiet struggle you survived',
    '🕊️ A promise to your future self',
    '☕ Where were you sitting as you wrote this?',
  ];

  const handleApplyPrompt = (promptText: string) => {
    setContent((prev) => {
      const cleanPrompt = promptText.replace(/^[^\w\s]+\s*/, '');
      const addition = prev.trim() ? `\n\n— Regarding: ${cleanPrompt}\n` : `— Regarding: ${cleanPrompt}\n`;
      return prev + addition;
    });
  };

  // Form submission handler
  const handleSealAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation checks
    if (!content.trim() || content.trim().length < 5) {
      setValidationError('Please write a letter of at least a few heartfelt sentences before sealing.');
      return;
    }

    if (!recipientEmail.trim()) {
      setValidationError('Please provide a destination email address where this letter should arrive.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      setValidationError('The email address provided does not appear to be valid.');
      return;
    }

    if (isDateInPast) {
      setValidationError('Time moves only forward! Please select a future date and time for delivery.');
      return;
    }

    setIsSubmitting(true);

    try {
      // User's browser timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Dear Future Me',
          senderName: senderName.trim() || null,
          letterContent: content.trim(),
          deliverAt: targetDate.toISOString(),
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientType === 'someone' ? recipientName.trim() : null,
          timezone: userTimezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seal and record your letter.');
      }

      // Celebrate with golden & warm stardust confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#DCC7A5', '#E8C581', '#B58B62', '#8C2D19', '#F5EBDD'],
      });

      // Clear draft from storage on confirmed schedule
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      // Notify parent to display confirmation card
      onSuccess({
        id: data.id,
        title: data.title,
        deliverAt: data.deliverAt,
        recipientEmail: data.recipientEmail,
        viewToken: data.viewToken,
        viewUrl: data.viewUrl,
      });
    } catch (err: any) {
      setValidationError(err.message || 'An unexpected error occurred while sealing your letter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="write-letter-form" className="parchment-sheet">
      {/* Corner Ornaments */}
      <div className="corner-ornament top-left" aria-hidden="true">✦</div>
      <div className="corner-ornament top-right" aria-hidden="true">✧</div>
      <div className="corner-ornament bottom-left" aria-hidden="true">☾</div>
      <div className="corner-ornament bottom-right" aria-hidden="true">୨୧</div>

      {/* Journal Header Bar */}
      <div className="journal-header">
        <div className="journal-title-box">
          <h2>The Open Diary Sheet</h2>
          <p className="journal-script-subtitle font-script">“Dip your pen in this moment, and speak to who you will become…”</p>
        </div>

        <div className="postmark-badge" aria-hidden="true">
          <span>TIME POST</span>
          <span className="postmark-date-script font-script">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <form onSubmit={handleSealAndSend} className="form-flow" noValidate>
        {/* ==============================================================
            SECTION 1: WRITE YOUR LETTER 💌
           ============================================================== */}
        <div className="section-block">
          <div className="section-head">
            <label htmlFor={contentId} className="section-label">
              <span>Write Your Letter</span> 💌
            </label>
            <span className="section-subtext font-script">“Dear future me…”</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {/* Letter Title Field */}
            <div className="vintage-input-wrap">
              <label htmlFor={titleId} className="input-label-sm">
                Letter Title or Subject (Optional)
              </label>
              <input
                id={titleId}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. A reflection on where I stand today..."
                className="vintage-input"
                maxLength={120}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>

            {/* Sender Name / Penned By Field */}
            <div className="vintage-input-wrap">
              <label htmlFor={senderNameId} className="input-label-sm">
                Your Name / Penned By (Optional)
              </label>
              <input
                id={senderNameId}
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Your name (or blank for 'Your Past Self')"
                className="vintage-input"
                maxLength={80}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>

          {/* Inspiration Chips */}
          <div className="inspiration-chips-row">
            <span className="chip-label">Need a spark?</span>
            {inspirationPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="inspiration-btn"
                onClick={() => handleApplyPrompt(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Diary Multiline Text Editor */}
          <div className="diary-textarea-wrap">
            <textarea
              id={contentId}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="diary-textarea"
              placeholder={`Hey, future me…\n\nWhat are you feeling right now? What are you hoping for? What do you want to remember about this moment in your life?\n\nWrite it all down. Your future self is waiting to hear from you…`}
              rows={12}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              data-gramm="false"
              data-enable-grammarly="false"
              required
            />

            {/* Live Count and Draft Status */}
            <div className="diary-meta-bar">
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <span>
                  <strong>{wordCount}</strong> {wordCount === 1 ? 'word' : 'words'}
                </span>
                <span>•</span>
                <span>
                  <strong>{charCount}</strong> {charCount === 1 ? 'character' : 'characters'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {draftSavedTime && (
                  <span className="draft-indicator">
                    <Sparkles size={14} />
                    {draftSavedTime}
                  </span>
                )}
                {content.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="clear-draft-link"
                  >
                    Clear draft
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==============================================================
            SECTION 2: CHOOSE YOUR DELIVERY DATE 🕰️
           ============================================================== */}
        <div className="section-block">
          <div className="section-head">
            <div className="section-label">
              <span>Choose Your Delivery Date</span> 🕰️
            </div>
            <span className="section-subtext font-script">“When should this letter find you?”</span>
          </div>

          <p style={{ fontStyle: 'italic', color: 'var(--color-warm-chocolate)', margin: 0 }}>
            Choose a day in the future. Your words will wait patiently until then.
          </p>

          {/* Preset Buttons */}
          <div className="date-presets-grid">
            <button
              type="button"
              className={`preset-date-btn ${activePreset === 'today' ? 'active' : ''}`}
              onClick={() => applyPreset('today')}
              style={activePreset === 'today' ? { borderColor: '#722F37', fontWeight: 'bold' } : undefined}
            >
              Today (Send Now ⚡)
            </button>
            <button
              type="button"
              className={`preset-date-btn ${activePreset === '6mo' ? 'active' : ''}`}
              onClick={() => applyPreset('6mo')}
            >
              +6 Months
            </button>
            <button
              type="button"
              className={`preset-date-btn ${activePreset === '1yr' ? 'active' : ''}`}
              onClick={() => applyPreset('1yr')}
            >
              +1 Year
            </button>
            <button
              type="button"
              className={`preset-date-btn ${activePreset === '3yr' ? 'active' : ''}`}
              onClick={() => applyPreset('3yr')}
            >
              +3 Years
            </button>
            <button
              type="button"
              className={`preset-date-btn ${activePreset === '5yr' ? 'active' : ''}`}
              onClick={() => applyPreset('5yr')}
            >
              +5 Years
            </button>
            <button
              type="button"
              className={`preset-date-btn ${activePreset === '10yr' ? 'active' : ''}`}
              onClick={() => applyPreset('10yr')}
            >
              +10 Years
            </button>
            <button
              type="button"
              className={`preset-date-btn ${activePreset === 'newyear' ? 'active' : ''}`}
              onClick={() => applyPreset('newyear')}
            >
              Next New Year 🎆
            </button>
          </div>

          {/* Detailed Day, Month, Year Controls with Direct Typing */}
          <div className="date-controls-grid">
            {/* Month */}
            <div className="vintage-input-wrap">
              <label className="input-label-sm">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setActivePreset('custom');
                }}
                className="vintage-select"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((monthName, idx) => (
                  <option key={idx} value={idx}>
                    {monthName}
                  </option>
                ))}
              </select>
            </div>

            {/* Day - Typed Number Input */}
            <div className="vintage-input-wrap">
              <label className="input-label-sm">
                Day <span style={{ textTransform: 'none', fontWeight: 'normal', opacity: 0.8 }}>(Type 1–{maxDays})</span>
              </label>
              <input
                type="number"
                min={1}
                max={maxDays}
                value={dayInput}
                onChange={handleDayInputChange}
                onBlur={handleDayBlur}
                className="vintage-input number-field"
                placeholder="Day"
              />
            </div>

            {/* Year - Typed Number Input */}
            <div className="vintage-input-wrap">
              <label className="input-label-sm">
                Year <span style={{ textTransform: 'none', fontWeight: 'normal', opacity: 0.8 }}>(Type e.g. 2028)</span>
              </label>
              <input
                type="number"
                min={now.getFullYear()}
                max={now.getFullYear() + 100}
                value={yearInput}
                onChange={handleYearInputChange}
                onBlur={handleYearBlur}
                className="vintage-input number-field"
                placeholder="Year"
              />
            </div>
          </div>

          {/* Preferred Delivery Time & Timezone with Typed Numbers */}
          <div className="delivery-time-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--color-warm-chocolate)' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Delivery Time:</span>
            </div>

            <div className="time-input-group">
              <input
                type="number"
                min={1}
                max={12}
                value={hourInput}
                onChange={handleHourInputChange}
                onBlur={handleHourBlur}
                className="vintage-input time-number-input"
                title="Type Hour (1-12)"
              />
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-vintage-brown)' }}>:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minuteInput}
                onChange={handleMinuteInputChange}
                onBlur={handleMinuteBlur}
                className="vintage-input time-number-input"
                title="Type Minute (00-59)"
              />
              <select
                value={deliveryPeriod}
                onChange={(e) => setDeliveryPeriod(e.target.value as 'AM' | 'PM')}
                className="time-select-sm"
              >
                <option value="AM">AM (Morning)</option>
                <option value="PM">PM (Evening)</option>
              </select>
            </div>

            <span style={{ fontSize: '0.85rem', color: 'var(--color-warm-chocolate)', fontStyle: 'italic' }}>
              Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time'}
            </span>
          </div>

          {/* Formatted Date Preview Ribbon */}
          <div className="date-preview-ribbon">
            <Calendar className="calendar-mini-icon" size={28} />
            <div className="date-preview-text">
              <span className="date-preview-main">
                {formattedDeliveryDate} at {formattedDeliveryTime}
              </span>
              <span className={`date-preview-sub ${isDateInPast ? 'text-red-700' : ''}`}>
                {timeHorizonText}
              </span>
            </div>
          </div>
        </div>

        {/* ==============================================================
            SECTION 3: WHERE SHOULD WE SEND IT? 📮
           ============================================================== */}
        <div className="section-block">
          <div className="section-head">
            <label htmlFor={emailId} className="section-label">
              <span>Where Should We Send It?</span> 📮
            </label>
            <span className="section-subtext font-script">“Where should your letter arrive?”</span>
          </div>

          <p style={{ fontStyle: 'italic', color: 'var(--color-warm-chocolate)', margin: 0 }}>
            Leave us an email address, and we'll deliver your words when the time is right.
          </p>

          {/* Recipient Mode: To Myself vs To Someone Else */}
          <div className="recipient-type-toggle">
            <button
              type="button"
              className={`toggle-pill ${recipientType === 'self' ? 'active' : ''}`}
              onClick={() => setRecipientType('self')}
            >
              <User size={15} style={{ display: 'inline', marginRight: '6px' }} />
              To My Future Self
            </button>
            <button
              type="button"
              className={`toggle-pill ${recipientType === 'someone' ? 'active' : ''}`}
              onClick={() => setRecipientType('someone')}
            >
              <Heart size={15} style={{ display: 'inline', marginRight: '6px' }} />
              To Someone I Care About
            </button>
          </div>

          {/* Optional recipient name if writing to someone else */}
          {recipientType === 'someone' && (
            <div className="vintage-input-wrap">
              <label htmlFor={recipientNameId} className="input-label-sm">
                Recipient's Name (Optional)
              </label>
              <input
                id={recipientNameId}
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. My dearest friend, or My sister"
                className="vintage-input"
              />
            </div>
          )}

          {/* Email Input Field */}
          <div className="vintage-input-wrap">
            <label htmlFor={emailId} className="input-label-sm">
              Destination Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id={emailId}
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="you@example.com"
                className="vintage-input"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="email-security-note">
            <Sparkles size={14} />
            <span>
              On the selected morning, an air-mail dispatch containing your exact words will arrive in this inbox.
            </span>
          </div>
        </div>

        {/* Validation Error Feedback */}
        {validationError && (
          <div className="validation-toast" role="alert">
            <AlertCircle size={20} />
            <span>{validationError}</span>
          </div>
        )}

        {/* ==============================================================
            FINAL SUBMISSION BUTTON & WAX SEALING 
           ============================================================== */}
        <div className="submit-container">
          <button
            type="submit"
            disabled={isSubmitting || isDateInPast}
            className="btn-seal-letter"
            aria-busy={isSubmitting}
          >
            <span className="wax-stamp-emblem" aria-hidden="true">
              DT
            </span>
            <span>
              {isSubmitting
                ? 'Melting the Crimson Wax & Sealing... ✨'
                : 'Seal My Letter & Send It Through Time ✨'}
            </span>
          </button>

          <p style={{ fontSize: '0.9rem', color: 'var(--color-warm-chocolate)', fontStyle: 'italic', margin: 0 }}>
            Once sealed, your words enter the silent current of time, waiting for their appointed hour.
          </p>
        </div>
      </form>
    </div>
  );
};

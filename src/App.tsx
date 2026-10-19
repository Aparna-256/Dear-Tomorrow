import { useState } from 'react';
import { CelestialDust } from './components/CelestialDust';
import { VintageMailboxIllustration } from './components/VintageMailboxIllustration';
import { LetterForm } from './components/LetterForm';
import { ConfirmationCard } from './components/ConfirmationCard';
import type { ConfirmedLetterData } from './components/ConfirmationCard';
import { PrivacyNotice } from './components/PrivacyNotice';
import { EmailConfigModal } from './components/EmailConfigModal';

export function App() {
  const [confirmedLetter, setConfirmedLetter] = useState<ConfirmedLetterData | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleLetterSuccess = (data: ConfirmedLetterData) => {
    setConfirmedLetter(data);
    setTimeout(() => {
      window.scrollTo({
        top: 200,
        behavior: 'smooth',
      });
    }, 150);
  };

  const handleWriteAnother = () => {
    setConfirmedLetter(null);
    setTimeout(() => {
      const element = document.getElementById('write-letter-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const scrollToForm = () => {
    const element = document.getElementById('write-letter-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Whimsical Floating Star Dust */}
      <CelestialDust />

      <main className="page-container">
        {/* Vintage Top Navigation Bar */}
        <header className="vintage-navbar">
          <div className="brand-badge">
            <span className="brand-logo-icon" aria-hidden="true">✉️</span>
            <div className="brand-title-wrap">
              <h1>Dear Tomorrow</h1>
              <p>Time Post Office ✧ Est. 2026</p>
            </div>
          </div>

          <div className="nav-actions">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="pill-status"
              style={{ cursor: 'pointer', background: 'rgba(220, 199, 165, 0.25)', border: '1px solid rgba(220, 199, 165, 0.5)' }}
              title="Connect real Gmail or Resend credentials"
            >
              <span>⚙️ Connect Live Email</span>
            </button>

            <div className="pill-status" title="Persistent delivery scheduler active">
              <span className="status-dot" aria-hidden="true"></span>
              <span>Time-Portal Active</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-section" aria-label="Welcome and introduction">
          <div className="hero-ornament" aria-hidden="true">
            ⋆｡°✩ ୨୧ ✧ ☾ ✧ ୨୧ ✩°｡⋆
          </div>

          <div className="hero-script-tagline">
            aesthetic vibes & letters across time
          </div>

          <h1 className="hero-title">
            Dear Tomorrow
          </h1>

          <p className="hero-tagline">
            “A little piece of today, delivered to the you of tomorrow.”
          </p>

          <p className="hero-description">
            Some thoughts deserve to find their way to the future. Write a letter to your future self, choose when it should arrive, and let time take care of the rest.
          </p>

          {/* Magical Envelope / Mailbox Vector Illustration */}
          <VintageMailboxIllustration />

          {/* Smooth Scroll Button */}
          {!confirmedLetter && (
            <button
              type="button"
              onClick={scrollToForm}
              className="btn-hero-write"
              aria-label="Scroll down to write your future letter"
            >
              <span>Write Your Future Letter ✉️</span>
            </button>
          )}
        </section>

        {/* Central Experience: Either Letter-Writing Journal or Confirmation Card */}
        {confirmedLetter ? (
          <ConfirmationCard
            letterData={confirmedLetter}
            onWriteAnother={handleWriteAnother}
          />
        ) : (
          <LetterForm onSuccess={handleLetterSuccess} />
        )}

        {/* Privacy & Sanctuary Information */}
        <PrivacyNotice />

        {/* Vintage-Inspired Footer */}
        <footer className="vintage-footer">
          <div className="footer-decor" aria-hidden="true">
            ⋆｡°✩ ୨୧ ✧ ☾ ✧ ୨୧ ✩°｡⋆
          </div>
          <p className="footer-quote">
            “Made for the person you're becoming ☾”
          </p>
          <p className="footer-sub">
            Dear Tomorrow · Letters preserved in memory and delivered across time.
          </p>
        </footer>
      </main>

      <EmailConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        defaultEmail="rosary.aparna@gmail.com"
      />
    </>
  );
}

export default App;

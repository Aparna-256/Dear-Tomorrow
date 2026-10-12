import { useState, useEffect } from 'react';
import { Mail, Calendar, Clock, Feather, CheckCircle2, Sparkles, Settings } from 'lucide-react';
import { EmailConfigModal } from './EmailConfigModal';

export interface ConfirmedLetterData {
  id: string;
  title: string;
  deliverAt: string;
  recipientEmail: string;
}

interface ConfirmationCardProps {
  letterData: ConfirmedLetterData;
  onWriteAnother: () => void;
}

export const ConfirmationCard = ({
  letterData,
  onWriteAnother,
}: ConfirmationCardProps) => {
  const [testSent, setTestSent] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [letterStatus, setLetterStatus] = useState<string>('pending');

  const deliveryDateObj = new Date(letterData.deliverAt);
  const formattedDeliveryDate = deliveryDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedDeliveryTime = deliveryDateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Calculate days remaining
  const now = new Date();
  const diffMs = deliveryDateObj.getTime() - now.getTime();
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  // Query letter status and preview link from backend
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/letters/${letterData.id}/status`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setLetterStatus(data.status);
            if (data.previewUrl) {
              setPreviewUrl(data.previewUrl);
            }
          }
        }
      } catch {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [letterData.id]);

  const handleSendTestSample = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);
      const res = await fetch('/api/letters/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: letterData.recipientEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestSent(true);
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
          setTestMessage('Delivered to test sandbox! You can preview it using the button below.');
        } else {
          setTestMessage('A test parchment dispatch was sent directly to your inbox!');
        }
      } else {
        setTestMessage(data.error || 'Could not dispatch test sample.');
      }
    } catch {
      setTestMessage('Network error dispatching test sample.');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <>
      <section className="confirmation-card" aria-live="polite">
        {/* Decorative Stamp Header */}
        <div className="corner-ornament top-left" aria-hidden="true">✦</div>
        <div className="corner-ornament top-right" aria-hidden="true">✧</div>
        <div className="corner-ornament bottom-left" aria-hidden="true">☾</div>
        <div className="corner-ornament bottom-right" aria-hidden="true">୨୧</div>

        <div className="giant-wax-seal" title="Sealed with care">
          DT
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <h2 className="confirmation-title">
            Your letter is safely tucked away! 💌
          </h2>
          <p className="confirmation-message">
            “It's a little magical, isn't it? Your words are now waiting for the perfect moment to find their way to the future.”
          </p>
        </div>

        {/* Summary Parchment Envelope */}
        <div className="letter-summary-box">
          <div className="summary-row">
            <span className="summary-label">
              <Feather size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Letter Title
            </span>
            <span className="summary-val">“{letterData.title}”</span>
          </div>

          <div className="summary-row">
            <span className="summary-label">
              <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Arrival Date
            </span>
            <span className="summary-val">{formattedDeliveryDate}</span>
          </div>

          <div className="summary-row">
            <span className="summary-label">
              <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Scheduled Delivery
            </span>
            <span className="summary-val">
              {formattedDeliveryTime} {diffDays === 0 ? '(Arrives today)' : `(approx. ${diffDays} days from now)`}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">
              <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Destination Inbox
            </span>
            <span className="summary-val" style={{ fontFamily: 'monospace', fontSize: '1.05rem' }}>
              {letterData.recipientEmail}
            </span>
          </div>

          <div className="summary-row">
            <span className="summary-label">
              <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Vault Status
            </span>
            <span className="summary-val" style={{ fontSize: '1rem', color: '#6B4938' }}>
              #{letterData.id} • {letterStatus === 'delivered' ? '✨ Dispatched / Delivered' : '⏳ Guarded in Vault'}
            </span>
          </div>
        </div>

        {/* Ethereal Preview Button if Sandbox */}
        {previewUrl && (
          <div style={{ width: '100%', maxWidth: '580px', padding: '14px 18px', background: 'rgba(232, 197, 129, 0.25)', border: '1.5px dashed #B58B62', borderRadius: '10px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#4A3026' }}>
              📬 <strong>Test Sandbox Delivery:</strong> Since live Gmail/Resend keys aren't set in <code>.env</code> yet, this letter was dispatched to your sandbox preview:
            </p>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-hero-write"
              style={{ fontSize: '1rem', padding: '10px 22px', textDecoration: 'none' }}
            >
              <span>Open Delivered Letter in Sandbox (Ethereal) ↗</span>
            </a>
          </div>
        )}

        {/* Test Sample Email Action & Connect Real Gmail Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {!testSent ? (
              <button
                type="button"
                onClick={handleSendTestSample}
                disabled={testLoading}
                className="inspiration-btn"
                style={{ padding: '8px 18px', fontSize: '0.95rem' }}
              >
                {testLoading ? 'Dispatching sample...' : '✉️ Send an instant sample preview'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2D5A27', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
                <span>{testMessage || 'Test sample sent!'}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="inspiration-btn"
              style={{ padding: '8px 18px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(140, 45, 25, 0.12)', borderColor: '#8C2D19', color: '#8C2D19' }}
            >
              <Settings size={15} />
              <span>Connect Real Gmail / Resend ⚙️</span>
            </button>
          </div>
        </div>

        {/* Button to write another letter */}
        <button
          type="button"
          onClick={onWriteAnother}
          className="btn-write-another"
        >
          <Feather size={18} />
          Write Another Future Letter 📜
        </button>
      </section>

      {/* Real Email Configuration Modal */}
      <EmailConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        defaultEmail={letterData.recipientEmail}
      />
    </>
  );
};

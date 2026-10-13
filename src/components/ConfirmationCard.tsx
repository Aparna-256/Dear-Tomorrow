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
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [sendNowError, setSendNowError] = useState<string | null>(null);
  const [sendNowSuccess, setSendNowSuccess] = useState<string | null>(null);

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

  const handleSendLetterNow = async () => {
    try {
      setIsSendingNow(true);
      setSendNowError(null);
      setSendNowSuccess(null);

      const res = await fetch(`/api/letters/${letterData.id}/send-now`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLetterStatus('delivered');
        setSendNowSuccess(`Letter successfully sent to ${letterData.recipientEmail}! Check your Gmail.`);
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
        }
      } else {
        setSendNowError(data.error || 'Failed to dispatch letter to recipient email.');
      }
    } catch (err: any) {
      setSendNowError(err.message || 'Network error attempting to send letter.');
    } finally {
      setIsSendingNow(false);
    }
  };

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
      if (res.ok && data.success) {
        setTestSent(true);
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
          setTestMessage('Delivered to test sandbox! You can preview it using the button below.');
        } else {
          setTestMessage(`Test sample dispatch sent directly to ${letterData.recipientEmail}!`);
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

        {/* Immediate Delivery Banner / Feedback */}
        {sendNowSuccess && (
          <div style={{ width: '100%', maxWidth: '580px', padding: '14px 18px', background: '#EEF8EC', border: '1.5px solid #B0D9A9', borderRadius: '10px', color: '#1D5A19', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: '1rem' }}>Dispatched to Gmail!</strong>
              <span style={{ fontSize: '0.9rem' }}>{sendNowSuccess}</span>
            </div>
          </div>
        )}

        {sendNowError && (
          <div style={{ width: '100%', maxWidth: '580px', padding: '14px 18px', background: '#FFF0EB', border: '1.5px solid #E4B5A5', borderRadius: '10px', color: '#7A2816', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <div>
                <strong style={{ display: 'block', fontSize: '1rem' }}>Delivery Error</strong>
                <span style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{sendNowError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="inspiration-btn"
              style={{ alignSelf: 'flex-start', marginTop: '6px', fontSize: '0.9rem', padding: '6px 14px', background: '#8C2D19', color: '#F5EBDD', borderColor: '#8C2D19' }}
            >
              <Settings size={14} style={{ display: 'inline', marginRight: '6px' }} />
              Open Email Settings to configure Google App Password
            </button>
          </div>
        )}

        {/* Primary Delivery Action: Send This Letter Right Now */}
        <div style={{ width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {letterStatus !== 'delivered' ? (
            <button
              type="button"
              onClick={handleSendLetterNow}
              disabled={isSendingNow}
              className="btn-hero-write"
              style={{ width: '100%', fontSize: '1.1rem', padding: '14px 24px', justifyContent: 'center' }}
            >
              <span>
                {isSendingNow
                  ? `Delivering to ${letterData.recipientEmail}... 📨`
                  : `✉️ Send This Letter to ${letterData.recipientEmail} Right Now`}
              </span>
            </button>
          ) : (
            <div style={{ padding: '10px 20px', background: 'rgba(45, 90, 39, 0.12)', border: '1px solid #2D5A27', borderRadius: '8px', color: '#2D5A27', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <CheckCircle2 size={18} />
              <span>Delivered to {letterData.recipientEmail}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            {!testSent ? (
              <button
                type="button"
                onClick={handleSendTestSample}
                disabled={testLoading}
                className="inspiration-btn"
                style={{ padding: '8px 18px', fontSize: '0.95rem' }}
              >
                {testLoading ? 'Dispatching sample...' : '✉️ Send instant test sample'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2D5A27', justifyContent: 'center', fontSize: '0.9rem' }}>
                <CheckCircle2 size={16} />
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
              <span>Configure Gmail Credentials ⚙️</span>
            </button>
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

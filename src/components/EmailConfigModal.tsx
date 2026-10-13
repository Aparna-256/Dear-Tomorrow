import React, { useState } from 'react';
import { Mail, Key, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react';

interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onConfigSaved?: () => void;
}

export const EmailConfigModal: React.FC<EmailConfigModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = 'rosary.aparna@gmail.com',
  onConfigSaved,
}) => {
  const [providerType, setProviderType] = useState<'gmail' | 'resend'>('gmail');
  const [gmailUser, setGmailUser] = useState(defaultEmail);
  const [testRecipient, setTestRecipient] = useState(defaultEmail);
  const [gmailAppPass, setGmailAppPass] = useState('');
  const [resendKey, setResendKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      let payload: any = {};
      if (providerType === 'gmail') {
        if (!gmailAppPass.trim()) {
          throw new Error('Please enter your 16-character Google App Password.');
        }
        payload = {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: gmailUser.trim(),
          smtpPass: gmailAppPass.trim().replace(/\s+/g, ''),
          emailFrom: `"Dear Tomorrow" <${gmailUser.trim()}>`,
        };
      } else {
        if (!resendKey.trim().startsWith('re_')) {
          throw new Error('Resend API keys usually start with "re_". Please check your key.');
        }
        payload = {
          resendApiKey: resendKey.trim(),
          emailFrom: 'Dear Tomorrow <onboarding@resend.dev>',
        };
      }

      // 1. Save settings to server .env
      const saveRes = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to save email settings.');
      }

      // 2. Immediately send a test verification email to the user's Gmail!
      const targetInbox = testRecipient.trim() || gmailUser.trim() || defaultEmail;
      const testRes = await fetch('/api/letters/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: targetInbox }),
      });

      const testData = await testRes.json();
      if (testRes.ok && testData.success) {
        setFeedback({
          type: 'success',
          message: `Connected successfully! A verification test letter has been dispatched to ${targetInbox}. Check your inbox!`,
        });
        if (onConfigSaved) onConfigSaved();
      } else {
        throw new Error(testData.error || 'Credentials saved, but test dispatch failed.');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error configuring email.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(30, 18, 14, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="parchment-sheet"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--color-vintage-brown)',
            cursor: 'pointer',
          }}
          aria-label="Close modal"
        >
          <X size={22} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📮 ✧ ✉️</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--color-vintage-brown)', margin: 0 }}>
            Connect Real Email Delivery
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-warm-chocolate)', fontStyle: 'italic', marginTop: '6px' }}>
            To deliver letters straight into your real Gmail inbox, connect either your Gmail account or Resend.
          </p>
        </div>

        {/* Tab selection */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            className={`toggle-pill ${providerType === 'gmail' ? 'active' : ''}`}
            onClick={() => setProviderType('gmail')}
          >
            <Mail size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Gmail (Google App Password)
          </button>
          <button
            type="button"
            className={`toggle-pill ${providerType === 'resend' ? 'active' : ''}`}
            onClick={() => setProviderType('resend')}
          >
            <Key size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Resend API Key
          </button>
        </div>

        <form onSubmit={handleSaveAndTest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {providerType === 'gmail' ? (
            <>
              <div className="vintage-input-wrap">
                <label className="input-label-sm">Your Gmail Address</label>
                <input
                  type="email"
                  value={gmailUser}
                  onChange={(e) => setGmailUser(e.target.value)}
                  className="vintage-input"
                  required
                />
              </div>

              <div className="vintage-input-wrap">
                <label className="input-label-sm">
                  Google 16-Character App Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={gmailAppPass}
                    onChange={(e) => setGmailAppPass(e.target.value)}
                    placeholder="e.g. abcd efgh ijkl mnop"
                    className="vintage-input"
                    required
                    style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                  />
                </div>
                <div style={{ background: 'rgba(232, 197, 129, 0.25)', border: '1px dashed #B58B62', borderRadius: '8px', padding: '10px 14px', marginTop: '8px', fontSize: '0.85rem', color: '#4A3026' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#8C2D19' }}>📌 How to get your 16-character Google App Password:</strong>
                  <ol style={{ margin: '4px 0 0 16px', padding: 0, lineHeight: '1.5' }}>
                    <li>Make sure <strong>2-Step Verification</strong> is ON in your Google Account.</li>
                    <li>
                      Visit{' '}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#8C2D19', fontWeight: 'bold', textDecoration: 'underline' }}
                      >
                        myaccount.google.com/apppasswords <ExternalLink size={11} style={{ display: 'inline' }} />
                      </a>
                    </li>
                    <li>Type App name: <em>Dear Tomorrow</em> and click <strong>Create</strong>.</li>
                    <li>Copy the 16 letters shown and paste them here!</li>
                  </ol>
                  <span style={{ display: 'block', marginTop: '6px', fontStyle: 'italic', color: '#6B4938' }}>
                    Note: Never use your regular Google account password here. Google requires App Passwords for SMTP.
                  </span>
                </div>
              </div>

              <div className="vintage-input-wrap">
                <label className="input-label-sm">Send Verification Test Email To</label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="customer@gmail.com"
                  className="vintage-input"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-warm-chocolate)', marginTop: '2px' }}>
                  We'll send a live test letter to this address immediately upon saving to verify delivery.
                </span>
              </div>
            </>
          ) : (
            <div className="vintage-input-wrap">
              <label className="input-label-sm">Resend API Key</label>
              <input
                type="text"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder="re_123456789..."
                className="vintage-input"
                required
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-warm-chocolate)', marginTop: '4px' }}>
                Get a free key at{' '}
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#8C2D19', textDecoration: 'underline' }}
                >
                  resend.com <ExternalLink size={12} style={{ display: 'inline' }} />
                </a>
              </span>
            </div>
          )}

          {feedback && (
            <div
              className="validation-toast"
              style={{
                backgroundColor: feedback.type === 'success' ? '#EEF8EC' : '#FFF0EB',
                borderColor: feedback.type === 'success' ? '#B0D9A9' : '#E4B5A5',
                color: feedback.type === 'success' ? '#1D5A19' : '#7A2816',
              }}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="btn-seal-letter"
            style={{ width: '100%', marginTop: '10px' }}
          >
            <span>{isSaving ? 'Connecting & Sending Test...' : 'Save & Send Test to My Gmail ✨'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

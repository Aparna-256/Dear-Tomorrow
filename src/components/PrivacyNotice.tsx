import { Lock, ShieldCheck, EyeOff, Archive } from 'lucide-react';

export const PrivacyNotice = () => {
  return (
    <section className="privacy-card" aria-label="Privacy and sanctuary notice">
      <div className="privacy-header">
        <Lock size={20} style={{ color: 'var(--color-gold-dust)' }} />
        <h3>A Sanctuary for Your Words</h3>
      </div>

      <p style={{ fontStyle: 'italic', color: 'var(--color-antique-beige)', margin: 0 }}>
        The thoughts you entrust to Dear Tomorrow are intimate, tender, and uniquely yours. We protect them with reverent care.
      </p>

      <div className="privacy-features-grid">
        <div className="privacy-feature">
          <h4>
            <EyeOff size={16} />
            Unlisted & Private
          </h4>
          <p>
            Your letter is never made public, indexed by search engines, or accessible via public URLs. Only the destination inbox receives the sealed dispatch.
          </p>
        </div>

        <div className="privacy-feature">
          <h4>
            <ShieldCheck size={16} />
            Encrypted Storage
          </h4>
          <p>
            Stored securely in an isolated, persistent vault with server-side validation and automated rate limiting to guard against abuse.
          </p>
        </div>

        <div className="privacy-feature">
          <h4>
            <Archive size={16} />
            Time-Guarded Delivery
          </h4>
          <p>
            Automated persistent task schedulers operate independently of whether your device or browser is open. When the dawn arrives, your letter takes flight.
          </p>
        </div>
      </div>
    </section>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Feather,
  Calendar,
  Clock,
  Sparkles,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Heart,
  ShieldCheck,
  Flame,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LetterData {
  id: string;
  viewToken: string;
  title: string;
  content: string;
  senderName: string | null;
  recipientName: string | null;
  recipientEmailMasked: string;
  deliverAt: string;
  createdAt: string;
  deliveredAt: string | null;
  status: string;
  timezone: string;
}

interface LetterDiaryPageProps {
  token: string;
  onNavigateHome: () => void;
}

// Global declaration for YouTube Iframe API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const YOUTUBE_VIDEO_ID = 'pyGU-UudvrM';
const SEGMENT_START = 20; // 00:20
const SEGMENT_END = 63;   // 01:03
const SEGMENT_DURATION = 43; // 43 seconds

export const LetterDiaryPage: React.FC<LetterDiaryPageProps> = ({ token, onNavigateHome }) => {
  const [letter, setLetter] = useState<LetterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [candleMode, setCandleMode] = useState(false);

  // Music & Unseal states
  const [isUnsealed, setIsUnsealed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [segmentFinished, setSegmentFinished] = useState(false);
  const [showOpenPrompt, setShowOpenPrompt] = useState(true);

  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Fetch letter details from backend
  useEffect(() => {
    let isMounted = true;
    const fetchLetter = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/letters/view/${encodeURIComponent(token)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'This letter could not be found in our time archives.');
        }
        const data = await res.json();
        if (isMounted) {
          setLetter(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to open this letter.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLetter();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Initialize YouTube Iframe API
  useEffect(() => {
    let isMounted = true;

    const createPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      try {
        playerRef.current = new window.YT.Player('yt-audio-player', {
          height: '1',
          width: '1',
          videoId: YOUTUBE_VIDEO_ID,
          playerVars: {
            start: SEGMENT_START,
            end: SEGMENT_END,
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              // Attempt autoplay with sound
              try {
                event.target.seekTo(SEGMENT_START, true);
                event.target.playVideo();
              } catch (e) {
                console.log('Autoplay attempt caught:', e);
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
                setShowOpenPrompt(false);
                setIsUnsealed(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Video ended (reached SEGMENT_END)
                setIsPlaying(false);
                setSegmentFinished(true);
                setSegmentProgress(SEGMENT_DURATION);
                if (playerRef.current?.seekTo) {
                  playerRef.current.seekTo(SEGMENT_START, true);
                }
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Audio Player error:', err);
            },
          },
        });
      } catch (e) {
        console.warn('Could not instantiate YouTube player:', e);
      }
    };

    // If API script already loaded
    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Load the script
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) {
          createPlayer();
        }
      };
    }

    return () => {
      isMounted = false;
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, []);

  // 3. Monitor playback segment time (00:20 to 01:03) and enforce stop at exactly 43 seconds
  useEffect(() => {
    if (!isPlaying) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    progressIntervalRef.current = setInterval(() => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;

      try {
        const currentTime = playerRef.current.getCurrentTime();

        // Enforce the 01:03 stop boundary
        if (currentTime >= SEGMENT_END || (currentTime > 0 && currentTime < SEGMENT_START - 0.5)) {
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(SEGMENT_START, true);
          setIsPlaying(false);
          setSegmentFinished(true);
          setSegmentProgress(SEGMENT_DURATION);
          return;
        }

        const elapsed = Math.max(0, Math.min(SEGMENT_DURATION, Math.floor(currentTime - SEGMENT_START)));
        setSegmentProgress(elapsed);
      } catch {}
    }, 250);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isPlaying]);

  // 4. Handle "Open Your Letter 💌" action
  const handleOpenLetterWithMusic = () => {
    setIsUnsealed(true);
    setShowOpenPrompt(false);

    // Trigger golden and warm celebratory stardust confetti!
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#D6C0A5', '#722F37', '#EBDCC7', '#C2A37E', '#8C2D19'],
    });

    // Start audio playback
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
          setIsMuted(false);
        }
        playerRef.current.seekTo(SEGMENT_START, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
        setSegmentFinished(false);
        setSegmentProgress(0);
      } catch (err) {
        console.warn('Playback start error:', err);
      }
    }
  };

  // Play / Pause Toggle
  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        if (segmentFinished || segmentProgress >= SEGMENT_DURATION) {
          playerRef.current.seekTo(SEGMENT_START, true);
          setSegmentFinished(false);
          setSegmentProgress(0);
        }
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch {}
  };

  // Replay Segment (20s to 63s)
  const handleReplaySegment = () => {
    if (!playerRef.current) return;
    try {
      playerRef.current.seekTo(SEGMENT_START, true);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setSegmentFinished(false);
      setSegmentProgress(0);
    } catch {}
  };

  // Mute / Unmute Toggle
  const handleToggleMute = () => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="page-container" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="parchment-sheet" style={{ maxWidth: '480px', textAlign: 'center', padding: '48px 24px' }}>
          <div className="giant-wax-seal" style={{ margin: '0 auto 24px auto', animation: 'float 3s ease-in-out infinite' }}>
            DT
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-text)', marginBottom: '12px' }}>
            Unsealing Your Letter...
          </h2>
          <p className="font-script" style={{ fontSize: '1.4rem', color: 'var(--color-accent-burgundy)', margin: 0 }}>
            “Traveling through the currents of time…”
          </p>
        </div>
      </main>
    );
  }

  if (error || !letter) {
    return (
      <main className="page-container" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="parchment-sheet" style={{ maxWidth: '540px', textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📜</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-text)', marginBottom: '14px' }}>
            Letter Not Found in Archives
          </h2>
          <p style={{ color: 'var(--color-secondary-text)', lineHeight: '1.7', marginBottom: '28px' }}>
            {error || 'This letter has not yet surfaced or may have dissolved into the quiet currents of time.'}
          </p>
          <button
            type="button"
            onClick={onNavigateHome}
            className="btn-hero-write"
            style={{ margin: '0 auto' }}
          >
            <span>Return to Dear Tomorrow ✉️</span>
          </button>
        </div>
      </main>
    );
  }

  const writtenDateObj = new Date(letter.createdAt);
  const formattedWrittenDate = writtenDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const deliverDateObj = new Date(letter.deliverAt);
  const formattedDeliverDate = deliverDateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate elapsed time between penning and delivery
  const diffTimeMs = Math.abs(deliverDateObj.getTime() - writtenDateObj.getTime());
  const diffDays = Math.round(diffTimeMs / (1000 * 60 * 60 * 24));

  let timeSpanLabel = 'Penned recently';
  if (diffDays >= 365) {
    const years = (diffDays / 365).toFixed(1).replace('.0', '');
    timeSpanLabel = `Sent ${years} ${Number(years) === 1 ? 'year' : 'years'} into the future`;
  } else if (diffDays >= 30) {
    const months = Math.round(diffDays / 30);
    timeSpanLabel = `Sent ${months} ${months === 1 ? 'month' : 'months'} into the future`;
  } else if (diffDays >= 1) {
    timeSpanLabel = `Sent ${diffDays} ${diffDays === 1 ? 'day' : 'days'} into the future`;
  }

  return (
    <div className={`diary-viewport ${candleMode ? 'candlelight-active' : ''}`}>
      {/* Official YouTube Iframe container (positioned cleanly off-screen to comply with policies while keeping audio pure) */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '200px',
          height: '200px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div id="yt-audio-player"></div>
      </div>

      {/* Top Navigation & Minimal Vintage Audio Controls */}
      <header className="diary-nav-bar no-print">
        <div className="diary-nav-left">
          <button
            type="button"
            onClick={onNavigateHome}
            className="diary-action-btn"
            title="Return to Dear Tomorrow homepage"
          >
            <ArrowLeft size={16} />
            <span>Dear Tomorrow</span>
          </button>
          <div className="diary-brand-sub font-script hide-on-mobile">Time Post Archive</div>
        </div>

        {/* Vintage Music Player Control Pill */}
        <div className="vintage-music-pill" role="region" aria-label="Vintage background melody controls">
          <div className="music-pill-status">
            <span className={`music-note-icon ${isPlaying ? 'playing' : ''}`}>
              <Music size={14} />
            </span>
            <div className="music-pill-info">
              <span className="music-track-title">Melody of Memory</span>
              <span className="music-track-time">
                0:{segmentProgress < 10 ? `0${segmentProgress}` : segmentProgress} / 0:43
              </span>
            </div>
          </div>

          {/* Animated Equalizer Wave */}
          <div className={`vintage-equalizer ${isPlaying ? 'active' : ''}`} aria-hidden="true">
            <span className="eq-bar bar-1"></span>
            <span className="eq-bar bar-2"></span>
            <span className="eq-bar bar-3"></span>
          </div>

          <div className="music-pill-actions">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="music-ctrl-btn"
              title={isPlaying ? 'Pause melody' : 'Play melody'}
              aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>

            <button
              type="button"
              onClick={handleReplaySegment}
              className="music-ctrl-btn"
              title="Replay segment (0:20 – 1:03)"
              aria-label="Replay segment from 20 seconds to 1 minute 3 seconds"
            >
              <RotateCcw size={13} />
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="music-ctrl-btn"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute melody' : 'Mute melody'}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          </div>
        </div>

        {/* Utility Actions */}
        <div className="diary-nav-actions">
          <button
            type="button"
            onClick={() => setCandleMode(prev => !prev)}
            className={`diary-action-btn ${candleMode ? 'active' : ''}`}
            title="Toggle warm candlelight reading atmosphere"
          >
            <Flame size={15} style={{ color: candleMode ? '#FFB84D' : 'inherit' }} />
            <span className="hide-on-mobile">{candleMode ? 'Candlelight On' : 'Candlelight'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="diary-action-btn"
            title="Copy unique link to this letter"
          >
            {copied ? <Check size={15} style={{ color: '#2D5A27' }} /> : <Copy size={15} />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="diary-action-btn"
            title="Print or save as keepsake PDF"
          >
            <Printer size={15} />
            <span className="hide-on-mobile">Save Keepsake</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          OPEN YOUR LETTER 💌 UNSEALING MODAL / PROMPT (If Autoplay was blocked)
          ========================================================================= */}
      {showOpenPrompt && !isUnsealed && (
        <div className="unseal-invitation-overlay" role="dialog" aria-modal="true" aria-label="Open Your Letter">
          <div className="unseal-envelope-card">
            <div className="corner-ornament top-left" aria-hidden="true">✦</div>
            <div className="corner-ornament top-right" aria-hidden="true">✧</div>
            <div className="corner-ornament bottom-left" aria-hidden="true">☾</div>
            <div className="corner-ornament bottom-right" aria-hidden="true">୨୧</div>

            <div className="envelope-air-mail-stripe" aria-hidden="true"></div>

            <div className="envelope-seal-badge" aria-hidden="true">
              <div className="giant-wax-seal pulse-glow">DT</div>
            </div>

            <div className="envelope-header-text">
              <span className="vintage-post-stamp-sub font-script">Time Post Vault · Sealed with Hope</span>
              <h2 className="unseal-card-title">A Letter Has Arrived Across Time</h2>
              <p className="unseal-card-excerpt">
                Penned on <em>{formattedWrittenDate}</em>
                {letter.senderName && <> by <strong>{letter.senderName}</strong></>}
              </p>
            </div>

            <p className="unseal-romantic-note font-script">
              “A tender melody waits within these pages to accompany your words…”
            </p>

            <button
              type="button"
              onClick={handleOpenLetterWithMusic}
              className="btn-open-letter-ceremony"
              aria-label="Open your letter and start background melody"
            >
              <span className="wax-stamp-emblem" aria-hidden="true">💌</span>
              <span>Open Your Letter 💌</span>
            </button>

            <span className="unseal-footnote">
              Begins your vintage reading journey with accompanying melody (0:20 – 1:03)
            </span>
          </div>
        </div>
      )}

      {/* Main Vintage Diary Book / Folio */}
      <main className="diary-book-wrapper">
        <article
          className={`vintage-diary-folio ${isUnsealed ? 'unsealed-appear' : ''}`}
          id="printable-letter"
        >
          {/* Silk Bookmark Ribbon */}
          <div className="silk-bookmark-ribbon" aria-hidden="true">
            <div className="ribbon-tail"></div>
          </div>

          {/* Corner Floral & Celestial Ornaments */}
          <div className="corner-ornament top-left" aria-hidden="true">✦</div>
          <div className="corner-ornament top-right" aria-hidden="true">✧</div>
          <div className="corner-ornament bottom-left" aria-hidden="true">☾</div>
          <div className="corner-ornament bottom-right" aria-hidden="true">୨୧</div>

          {/* Top Postmark and Air-Mail Authentication Stamp */}
          <header className="diary-folio-header">
            <div className="postmark-dual-stamp">
              <div className="postmark-circle">
                <span className="postmark-city">TIME POST</span>
                <span className="postmark-star">★ ★ ★</span>
                <span className="postmark-date-text">{formattedWrittenDate}</span>
                <span className="postmark-status">PRESERVED</span>
              </div>
              <div className="postmark-bars" aria-hidden="true">
                <span className="bar"></span>
                <span className="bar"></span>
                <span className="bar"></span>
              </div>
            </div>

            <div className="archive-badge-card">
              <div className="archive-badge-header">
                <ShieldCheck size={13} style={{ display: 'inline', marginRight: '4px' }} />
                <span>ARCHIVE REF: #{letter.id}</span>
              </div>
              <div className="archive-timespan">
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                <span>{timeSpanLabel}</span>
              </div>
            </div>
          </header>

          {/* Letter Title Banner */}
          <section className="diary-letter-title-section">
            <div className="letter-filigree-ornament" aria-hidden="true">
              ⋆｡°✩ ୨୧ ✧ ☾ ✧ ୨୧ ✩°｡⋆
            </div>
            <h1 className="diary-letter-title">
              “{letter.title}”
            </h1>
            <div className="diary-meta-penned">
              <span className="penned-on">
                <Calendar size={14} style={{ display: 'inline', marginRight: '5px' }} />
                Penned on <strong>{formattedWrittenDate}</strong>
              </span>

              {letter.senderName && (
                <span className="penned-by font-handwritten">
                  from the heart of <em>{letter.senderName}</em>
                </span>
              )}

              {letter.recipientName && (
                <span className="addressed-to">
                  <Heart size={13} style={{ display: 'inline', marginRight: '4px', color: 'var(--color-accent-burgundy)' }} />
                  Addressed to <strong>{letter.recipientName}</strong>
                </span>
              )}
            </div>
          </section>

          {/* Decorative Divider */}
          <div className="vintage-ruler-divider" aria-hidden="true">
            <span className="ruler-gem">✧</span>
          </div>

          {/* Main Letter Content Body: Preserves exact paragraph breaks, spacing, formatting */}
          <section className="diary-letter-body">
            {letter.content.split('\n\n').map((paragraph, pIdx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              // On the very first paragraph, optionally apply elegant drop cap styling
              const isFirst = pIdx === 0;

              return (
                <div key={pIdx} className={`diary-paragraph ${isFirst ? 'first-paragraph' : ''}`}>
                  {trimmed.split('\n').map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {line}
                      {lIdx < trimmed.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              );
            })}
          </section>

          {/* Diary Folio Footer: Wax Seal, Sign-off & Keepsake Details */}
          <footer className="diary-folio-footer">
            <div className="diary-sign-off">
              <p className="font-script sign-off-quote">
                “Written with love, by the you who existed back then.”
              </p>
              {letter.senderName ? (
                <p className="sign-off-author font-handwritten">
                  — Always, {letter.senderName}
                </p>
              ) : (
                <p className="sign-off-author font-handwritten">
                  — Always, Your Past Self
                </p>
              )}
            </div>

            {/* Embossed Crimson Wax Seal */}
            <div className="wax-seal-ceremony">
              <div className="giant-wax-seal" title="Sealed with Timeless Remembrance">
                DT
              </div>
              <div className="seal-caption font-script">
                Sealed in the Time Vault · Delivered {formattedDeliverDate}
              </div>
            </div>
          </footer>
        </article>

        {/* Action Callout Banner: Write Your Own Letter */}
        <div className="diary-cta-banner no-print">
          <div className="cta-icon-wrap" aria-hidden="true">
            <Feather size={28} />
          </div>
          <div className="cta-text-wrap">
            <h3>Touched by these words from across time?</h3>
            <p>
              Speak to the person you are becoming. Write a letter to your future self and let time take care of the rest.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateHome}
            className="btn-hero-write"
            style={{ flexShrink: 0 }}
          >
            <Sparkles size={16} />
            <span>Write a Future Letter ✉️</span>
          </button>
        </div>
      </main>

      {/* Subtle Vintage Page Footer */}
      <footer className="vintage-footer no-print">
        <p className="footer-quote">
          “A little piece of today, delivered to the you of tomorrow.”
        </p>
        <p className="footer-sub">
          Dear Tomorrow · A sanctuary for words sent across time ☾
        </p>
      </footer>
    </div>
  );
};

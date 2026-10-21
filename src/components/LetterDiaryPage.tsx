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
  Music,
  Maximize2,
  Download,
  FileText,
  ChevronDown,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

type AnimationStage = 'sealed' | 'unsealing' | 'emerging' | 'unrolling' | 'read';

// Romantic Celebration Balloons
const CELEBRATION_BALLOONS = [
  { id: 1, left: '10%', color: '#722F37', size: 56, delay: '0.1s', speed: '6.5s', sway: '18px' },
  { id: 2, left: '22%', color: '#D8B78E', size: 46, delay: '0.35s', speed: '7.2s', sway: '-22px' },
  { id: 3, left: '34%', color: '#E8B4B8', size: 54, delay: '0.6s', speed: '6.8s', sway: '16px' },
  { id: 4, left: '66%', color: '#FAF3E8', size: 50, delay: '0.2s', speed: '7.4s', sway: '-18px' },
  { id: 5, left: '78%', color: '#8C2D19', size: 52, delay: '0.5s', speed: '6.3s', sway: '22px' },
  { id: 6, left: '88%', color: '#C2A37E', size: 44, delay: '0.75s', speed: '7.0s', sway: '-15px' },
];

// Romantic Celebration Hearts & Stars
const CELEBRATION_HEARTS = [
  { id: 1, left: '16%', symbol: '💖', size: '1.5rem', delay: '0.15s', speed: '5.2s' },
  { id: 2, left: '26%', symbol: '✨', size: '1.2rem', delay: '0.45s', speed: '5.8s' },
  { id: 3, left: '40%', symbol: '💕', size: '1.7rem', delay: '0.1s', speed: '4.8s' },
  { id: 4, left: '62%', symbol: '✦', size: '1.3rem', delay: '0.35s', speed: '6.0s' },
  { id: 5, left: '72%', symbol: '💖', size: '1.6rem', delay: '0.65s', speed: '5.5s' },
  { id: 6, left: '84%', symbol: '✧', size: '1.2rem', delay: '0.25s', speed: '6.2s' },
];

export const LetterDiaryPage: React.FC<LetterDiaryPageProps> = ({ token, onNavigateHome }) => {
  const [letter, setLetter] = useState<LetterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [candleMode, setCandleMode] = useState(false);

  // Envelope and Scroll Unrolling animation state machine
  const [stage, setStage] = useState<AnimationStage>('sealed');
  const [showCelebration, setShowCelebration] = useState(false);

  // Music state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [segmentFinished, setSegmentFinished] = useState(false);

  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keepsake Download state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showKeepsakeMenu, setShowKeepsakeMenu] = useState(false);
  const [keepsakeDownloaded, setKeepsakeDownloaded] = useState(false);
  const keepsakeMenuRef = useRef<HTMLDivElement>(null);

  // Close keepsake dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (keepsakeMenuRef.current && !keepsakeMenuRef.current.contains(event.target as Node)) {
        setShowKeepsakeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            autoplay: 0,
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
            onReady: (_event: any) => {
              if (!isMounted) return;
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Video ended (reached SEGMENT_END at 01:03)
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

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
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

  // 4. Interactive Wax Seal Click: Sequential Envelope Opening, Emergence, & Scroll Unrolling
  const handleUnsealEnvelope = () => {
    if (stage !== 'sealed') return;

    // 1. Start music immediately upon user click (satisfies browser policy)
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
        console.warn('Audio playback error:', err);
      }
    }

    // Step A: Wax seal cracks & flap opens
    setStage('unsealing');

    // Step B: Envelope flap wide open -> Letter slowly slides out of envelope
    setTimeout(() => {
      setStage('emerging');
      setShowCelebration(true);

      // Elegant double confetti cannon burst
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.22, y: 0.65 },
        colors: ['#722F37', '#8C2D19', '#D8B78E', '#F5EBDD', '#E2D0B8', '#E8B4B8'],
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.78, y: 0.65 },
        colors: ['#722F37', '#8C2D19', '#D8B78E', '#F5EBDD', '#E2D0B8', '#E8B4B8'],
      });
    }, 700);

    // Step C: Letter begins unrolling from top to bottom like a royal parchment scroll
    setTimeout(() => {
      setStage('unrolling');

      // Second gentle stardust celebration shower
      confetti({
        particleCount: 40,
        spread: 85,
        origin: { y: 0.35 },
        colors: ['#D8B78E', '#FFFDF8', '#722F37', '#C2A37E'],
      });
    }, 1600);

    // Step D: Unrolling completes -> Reveal complete personalized vintage diary layout
    setTimeout(() => {
      setStage('read');
      // Hide celebration balloons after they float away
      setTimeout(() => setShowCelebration(false), 8000);
    }, 4200);
  };

  // Replay Opening Experience
  const handleReplayOpening = () => {
    setStage('sealed');
    setShowCelebration(false);
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(SEGMENT_START, true);
        setIsPlaying(false);
        setSegmentProgress(0);
      } catch {}
    }
  };

  // Skip animation directly to reading view
  const handleSkipToLetter = () => {
    setStage('read');
    setShowCelebration(false);
    if (playerRef.current && !isPlaying) {
      try {
        playerRef.current.seekTo(SEGMENT_START, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
      } catch {}
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

  // Direct PDF Keepsake Download
  const handleDownloadPdf = async () => {
    if (!letter || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setShowKeepsakeMenu(false);

    try {
      // If the envelope is not yet opened, bring the letter to reading view
      if (stage !== 'read') {
        setStage('read');
      }

      // Allow DOM layout and fonts to settle
      await new Promise(resolve => setTimeout(resolve, 350));

      const folioElement = document.getElementById('printable-letter');
      if (!folioElement) {
        throw new Error('Letter document element not found');
      }

      // Capture high-resolution parchment canvas
      const canvas = await html2canvas(folioElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FAF3E8',
        logging: false,
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = 210; // Standard A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = Math.max(297, pdfHeight + 10);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pageHeight],
      });

      pdf.addImage(imgData, 'JPEG', 0, 5, pdfWidth, pdfHeight);

      const safeTitle = (letter.title || 'Personalized_Letter')
        .trim()
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .replace(/\s+/g, '_');

      pdf.save(`Dear_Tomorrow_${safeTitle}_Keepsake.pdf`);

      setKeepsakeDownloaded(true);
      setTimeout(() => setKeepsakeDownloaded(false), 3500);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback: download clean text archive
      handleDownloadTextArchive();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Plain Text Offline Archive Backup
  const handleDownloadTextArchive = () => {
    if (!letter) return;
    const formattedCreated = new Date(letter.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedDeliver = new Date(letter.deliverAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const content = [
      '=====================================================================',
      '                       DEAR TOMORROW ARCHIVE                         ',
      '                   A Letter to Your Future Self                      ',
      '=====================================================================',
      '',
      `TITLE: ${letter.title}`,
      `PENNED ON: ${formattedCreated}`,
      letter.senderName ? `WRITTEN BY: ${letter.senderName}` : '',
      letter.recipientName ? `ADDRESSED TO: ${letter.recipientName}` : '',
      `DELIVERY DATE: ${formattedDeliver}`,
      `ARCHIVE REFERENCE: #${letter.id}`,
      '',
      '---------------------------------------------------------------------',
      '',
      letter.content,
      '',
      '---------------------------------------------------------------------',
      letter.senderName ? `— Always, ${letter.senderName}` : '— Always, Your Past Self',
      '“Written with love, by the you who existed back then.”',
      '',
      'Preserved in the Time Post Vault · Dear Tomorrow',
      '=====================================================================',
    ].filter(Boolean).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (letter.title || 'Letter')
      .trim()
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_');
    a.download = `Dear_Tomorrow_${safeTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowKeepsakeMenu(false);
  };

  // Browser print dialog
  const handlePrint = () => {
    setShowKeepsakeMenu(false);
    if (stage !== 'read') {
      setStage('read');
      setTimeout(() => window.print(), 350);
    } else {
      window.print();
    }
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
      {/* Official YouTube Iframe container (positioned cleanly off-screen) */}
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

      {/* Floating Celebration Layer: Balloons & Hearts */}
      {showCelebration && (
        <div className="celebration-layer" aria-hidden="true">
          {/* Floating Balloons */}
          {CELEBRATION_BALLOONS.map(b => (
            <div
              key={b.id}
              className="floating-balloon-item"
              style={{
                left: b.left,
                animationDelay: b.delay,
                animationDuration: b.speed,
                ['--sway-dist' as any]: b.sway,
              }}
            >
              <svg width={b.size} height={b.size * 1.5} viewBox="0 0 50 75" fill="none">
                {/* Balloon body */}
                <ellipse cx="25" cy="28" rx="22" ry="26" fill={b.color} />
                {/* Specular shine */}
                <ellipse cx="18" cy="18" rx="7" ry="11" fill="rgba(255,255,255,0.38)" transform="rotate(-20 18 18)" />
                {/* Knot */}
                <polygon points="22,54 28,54 25,58" fill={b.color} />
                {/* Wavy string */}
                <path d="M25,58 Q23,65 26,70 T24,75" stroke="#D8B78E" strokeWidth="1.2" fill="none" opacity="0.8" />
              </svg>
            </div>
          ))}

          {/* Floating Romantic Hearts */}
          {CELEBRATION_HEARTS.map(h => (
            <div
              key={h.id}
              className="floating-heart-item"
              style={{
                left: h.left,
                fontSize: h.size,
                animationDelay: h.delay,
                animationDuration: h.speed,
              }}
            >
              {h.symbol}
            </div>
          ))}
        </div>
      )}

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
          {stage === 'read' && (
            <button
              type="button"
              onClick={handleReplayOpening}
              className="diary-action-btn"
              title="Re-seal and watch envelope unrolling again"
            >
              <RotateCcw size={14} />
              <span className="hide-on-mobile">Re-seal & Open</span>
            </button>
          )}

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

          {/* Keepsake Action Group (Direct PDF Download + Options Menu) */}
          <div className="keepsake-action-container" ref={keepsakeMenuRef}>
            <div className="keepsake-btn-group">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="keepsake-main-btn"
                title="Download personalized letter as a vintage PDF keepsake"
                aria-label="Download letter as PDF keepsake"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 size={15} className="spin-icon" />
                    <span>Generating...</span>
                  </>
                ) : keepsakeDownloaded ? (
                  <>
                    <Check size={15} style={{ color: '#2D5A27' }} />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span className="hide-on-mobile">Save Keepsake</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowKeepsakeMenu(prev => !prev)}
                className={`keepsake-chevron-btn ${showKeepsakeMenu ? 'active' : ''}`}
                title="More keepsake options"
                aria-label="More keepsake options"
                aria-expanded={showKeepsakeMenu}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Keepsake Dropdown Options */}
            {showKeepsakeMenu && (
              <div className="keepsake-dropdown-menu" role="menu">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="keepsake-dropdown-item"
                  role="menuitem"
                >
                  <span className="keepsake-item-icon">
                    <Download size={16} />
                  </span>
                  <div className="keepsake-item-content">
                    <span className="keepsake-item-title">Download PDF Keepsake</span>
                    <span className="keepsake-item-desc">High-res parchment with wax seal</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTextArchive}
                  className="keepsake-dropdown-item"
                  role="menuitem"
                >
                  <span className="keepsake-item-icon">
                    <FileText size={16} />
                  </span>
                  <div className="keepsake-item-content">
                    <span className="keepsake-item-title">Download Text Backup</span>
                    <span className="keepsake-item-desc">Plain text (.txt) offline archive</span>
                  </div>
                </button>

                <div className="keepsake-dropdown-divider" aria-hidden="true"></div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="keepsake-dropdown-item"
                  role="menuitem"
                >
                  <span className="keepsake-item-icon">
                    <Printer size={16} />
                  </span>
                  <div className="keepsake-item-content">
                    <span className="keepsake-item-title">Print Letter</span>
                    <span className="keepsake-item-desc">Open browser print dialog</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          STAGE 1 to 4: 3D ANIMATED VINTAGE ENVELOPE & UNROLLING LETTER SCROLL
          ========================================================================= */}
      {stage !== 'read' && (
        <section className={`envelope-ceremony-stage stage-${stage}`} aria-label="Interactive letter unsealing ceremony">
          {/* Skip animation option */}
          <button
            type="button"
            onClick={handleSkipToLetter}
            className="btn-skip-unseal no-print"
            title="Skip animation to read letter immediately"
          >
            <span>Skip to letter</span>
            <Maximize2 size={13} />
          </button>

          <div className="envelope-scene-wrapper">
            {/* The 3D Vintage Envelope */}
            <div className={`vintage-envelope-3d ${stage}`}>
              {/* Envelope Back Plate (interior lining) */}
              <div className="env-back-interior"></div>

              {/* Emergence / Unrolling Letter Scroll */}
              <div className="env-scroll-carriage">
                <div className="env-scroll-cylinder top-cylinder">
                  <div className="roller-finial left"></div>
                  <div className="roller-rod"></div>
                  <div className="roller-finial right"></div>
                </div>

                <div className="env-scroll-canvas">
                  <div className="scroll-paper-texture">
                    {/* Watermark Postmark */}
                    <div className="scroll-postmark-badge">
                      <span>TIME POST AIR-MAIL</span>
                      <span className="scroll-star-row">✦ ✧ ✦</span>
                    </div>

                    <h2 className="scroll-penned-title font-display">
                      “{letter.title}”
                    </h2>

                    <div className="scroll-meta-line font-script">
                      Penned on {formattedWrittenDate}
                      {letter.senderName && <> · from {letter.senderName}</>}
                    </div>

                    <div className="scroll-body-preview">
                      <p className="scroll-paragraph-preview font-body">
                        {letter.content.slice(0, 320)}...
                      </p>
                    </div>

                    <div className="scroll-seal-imprint">
                      <div className="mini-wax-seal">DT</div>
                    </div>
                  </div>
                </div>

                <div className="env-scroll-cylinder bottom-cylinder">
                  <div className="roller-finial left"></div>
                  <div className="roller-rod"></div>
                  <div className="roller-finial right"></div>
                </div>
              </div>

              {/* Envelope Front Pocket (Lower triangle & side flaps) */}
              <div className="env-pocket-front">
                {/* Air-mail border edge */}
                <div className="env-airmail-border-stripe" aria-hidden="true"></div>

                {/* Postage Stamp & Cancellation Postmark */}
                <div className="env-postmark-stamp" aria-hidden="true">
                  <div className="postmark-circle-seal">
                    <span className="seal-text-top">AIR MAIL</span>
                    <span className="seal-text-center">★ TIME POST ★</span>
                    <span className="seal-text-bottom">{formattedWrittenDate}</span>
                  </div>
                  <div className="postage-stamp-box">
                    <span className="stamp-art">🕊️</span>
                    <span className="stamp-denom">DT</span>
                  </div>
                </div>

                {/* Handwritten Calligraphy Address */}
                <div className="env-address-lines">
                  <div className="env-addr-row">
                    <span className="addr-tag font-script">To:</span>
                    <span className="addr-content font-handwritten">
                      {letter.recipientName || 'Dearest You'}
                    </span>
                  </div>
                  <div className="env-addr-row">
                    <span className="addr-tag font-script">From:</span>
                    <span className="addr-content font-handwritten">
                      {letter.senderName || 'Your Past Self'}
                    </span>
                  </div>
                  <div className="env-addr-row sub">
                    <span className="addr-note">
                      Delivered across time · Ref: #{letter.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Triangular Flap with 3D Flip */}
              <div className="env-flap-top">
                <div className="flap-triangle-shape"></div>

                {/* Center Wax Seal Button */}
                <button
                  type="button"
                  onClick={handleUnsealEnvelope}
                  disabled={stage !== 'sealed'}
                  className={`wax-seal-interactive-btn ${stage !== 'sealed' ? 'seal-broken' : ''}`}
                  title="Click to break the wax seal, start the melody & unroll your letter"
                  aria-label="Click to break the wax seal, play background music, and unroll letter"
                >
                  <span className="wax-seal-crest">DT</span>
                  <span className="wax-pulse-ring" aria-hidden="true"></span>
                  <span className="wax-shimmer-sparkle left" aria-hidden="true">✦</span>
                  <span className="wax-shimmer-sparkle right" aria-hidden="true">✧</span>
                </button>
              </div>
            </div>

            {/* Hint instruction under envelope */}
            {stage === 'sealed' && (
              <div className="envelope-click-hint" onClick={handleUnsealEnvelope}>
                <span className="hint-hand-icon">💌</span>
                <span className="hint-text font-script">
                  “Click the crimson wax seal to break the seal, hear the melody & unroll your letter…”
                </span>
                <span className="hint-gem">✦</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          STAGE 5: FULL PERSONALIZED VINTAGE DIARY READING VIEW
          ========================================================================= */}
      <main className={`diary-book-wrapper ${stage === 'read' ? 'folio-visible' : 'folio-hidden'}`}>
        <article className="vintage-diary-folio" id="printable-letter">
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

              // On the very first paragraph, apply elegant drop cap styling
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

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="btn-folio-download no-print"
                title="Download this personalized letter as a vintage PDF keepsake"
                aria-label="Download keepsake PDF"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 size={13} className="spin-icon" />
                    <span>Generating Keepsake PDF...</span>
                  </>
                ) : keepsakeDownloaded ? (
                  <>
                    <Check size={13} style={{ color: '#2D5A27' }} />
                    <span>Keepsake PDF Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>Download Keepsake PDF</span>
                  </>
                )}
              </button>
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

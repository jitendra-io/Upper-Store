import { useState, useEffect } from 'react';
import CrystalCore3D from './CrystalCore3D';
import './MaintenanceBreak.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MaintenanceBreak = ({ onRecover }) => {
  const [checking, setChecking] = useState(false);
  const [secondsUntilNextCheck, setSecondsUntilNextCheck] = useState(15);
  const [checkMessage, setCheckMessage] = useState('');

  const checkStatus = async () => {
    setChecking(true);
    setCheckMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'healthy' && !data.maintenance) {
          if (onRecover) {
            onRecover();
          } else {
            window.location.reload();
          }
          return;
        }
      }
      setCheckMessage('Systems are still recovering. Next automatic check scheduled.');
    } catch (_) {
      setCheckMessage('Network unreachable. Retrying automatically.');
    } finally {
      setChecking(false);
      setSecondsUntilNextCheck(15);
    }
  };

  useEffect(() => {
    // 1-second countdown ticker
    const timer = setInterval(() => {
      setSecondsUntilNextCheck((prev) => {
        if (prev <= 1) {
          checkStatus();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="maintenance-break-container" role="alert" aria-live="assertive">
      <div className="maintenance-orb-wrapper">
        <CrystalCore3D minimal={true} />
      </div>

      <div className="maintenance-badge">
        <span className="maintenance-pulse-dot" />
        <span>System Operations Notice</span>
      </div>

      <h1 className="maintenance-heading">Under Temporary Maintenance</h1>

      <p className="maintenance-subtext">
        Upper Store is currently undergoing scheduled platform optimization and maintenance.
        Platform access will automatically resume as soon as systems are restored.
      </p>

      <div className="maintenance-status-card">
        <div className="maintenance-status-row">
          <span className="status-label">Platform Status</span>
          <span className="status-val status-recovering">
            <span className="status-mini-dot" />
            Maintenance in Progress
          </span>
        </div>
        <div className="maintenance-status-row">
          <span className="status-label">Automatic System Check</span>
          <span className="status-val status-timer">
            In {secondsUntilNextCheck}s
          </span>
        </div>
      </div>

      {checkMessage && (
        <div className="maintenance-feedback-message">
          {checkMessage}
        </div>
      )}

      <div className="maintenance-actions">
        <button
          type="button"
          className="maintenance-retry-btn"
          onClick={checkStatus}
          disabled={checking}
        >
          {checking ? (
            <>
              <span className="maintenance-spinner" />
              <span>Verifying Status...</span>
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>Check Status Now</span>
            </>
          )}
        </button>
      </div>
    </main>
  );
};

export default MaintenanceBreak;

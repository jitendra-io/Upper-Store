import React from 'react';

/**
 * Upper Store Unified SVG Icon Set
 * High-definition, vector icons replacing Unicode emojis and special characters.
 */

export const CrownIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={`upper-icon crown-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <path d="M5 19h14a1 1 0 0 0 0-2H5a1 1 0 0 0 0 2zm15.6-11.8a1 1 0 0 0-1.1-.2L16 8.7l-3.2-5.4a1 1 0 0 0-1.6 0L8 8.7 4.5 7a1 1 0 0 0-1.4 1.2l2.3 8.3c.1.3.4.5.7.5h11.8c.3 0 .6-.2.7-.5l2.3-8.3a1 1 0 0 0-.3-1z" />
  </svg>
);

export const DiamondIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon diamond-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <path d="M6 3h12l4 6-10 12L2 9z" />
    <path d="M11 3 8 9l4 12 4-12-3-6" />
    <path d="M2 9h20" />
  </svg>
);

export const SparkleIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    className={`upper-icon sparkle-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
  </svg>
);

export const LockIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon lock-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const CheckIcon = ({ size = 16, className = '', style = {}, strokeWidth = 2.5, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon check-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const StarIcon = ({ size = 16, className = '', fill = "currentColor", style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon star-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const AlertTriangleIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon alert-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const ArrowRightIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon arrow-right-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export const CloseIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon close-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const LightbulbIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon lightbulb-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
  </svg>
);

export const ShieldCheckIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon shield-check-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const TrashIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon trash-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const ShieldOffIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon shield-off-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.11 1.17" />
    <path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const CoinsIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon coins-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4H7" />
    <path d="M16 12h1v4h-1" />
  </svg>
);

export const SettingsSlidersIcon = ({ size = 16, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon sliders-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export const ToggleOnIcon = ({ size = 20, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`upper-icon toggle-on-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <rect x="1" y="5" width="22" height="14" rx="7" fill="rgba(16, 185, 129, 0.25)" stroke="#10b981" strokeWidth="2" />
    <circle cx="16" cy="12" r="5" fill="#10b981" />
  </svg>
);

export const ToggleOffIcon = ({ size = 20, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`upper-icon toggle-off-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <rect x="1" y="5" width="22" height="14" rx="7" fill="rgba(148, 163, 184, 0.15)" stroke="#64748b" strokeWidth="2" />
    <circle cx="8" cy="12" r="5" fill="#94a3b8" />
  </svg>
);

export const QrCodeIcon = ({ size = 18, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon qr-code-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <path d="M14 14h3v3h-3z" />
    <path d="M20 14v3" />
    <path d="M14 20h3" />
    <path d="M20 20v.01" />
  </svg>
);

export const CreditCardIcon = ({ size = 18, className = '', style = {}, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`upper-icon credit-card-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    {...props}
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);


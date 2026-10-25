import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckIcon } from '../components/Icons';
import './Policies.css';

// Sleek SVG Icon Components
const StoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <path d="M16 10a4 4 0 0 1-8 0"></path>
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const TermsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const PrinterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px', verticalAlign: 'middle' }}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const POLICIES_DATA = {
  store: {
    id: 'store',
    title: 'Store & Refund Policy',
    subtitle: 'Rules governing digital product licensing, delivery mechanisms, and refund guarantees.',
    iconComponent: StoreIcon,
    sections: [
      {
        title: '1. Digital Product Delivery',
        content: `All digital assets, applications (.apk for Android, .exe for Windows), source code packages, UI kits, and vector graphic bundles purchased or downloaded from Upper Store are fulfilled digitally via instant download links or mirrored through verified GitHub Release endpoints. Upon successful transaction or selection, download links remain permanently accessible in your session or account repository.`
      },
      {
        title: '2. Refund Eligibility & Digital Guarantee',
        content: `Because Upper Store offers non-tangible, irrevocable digital goods:
• Free / Open Source Tier: Offered as-is without financial transaction.
• Premium Digital Items: Eligible for full refund within 14 calendar days of purchase if the file is proven defective, corrupted, or fundamentally non-functional as advertised, and our support team cannot resolve the issue within 72 hours.
• Ineligibility: Refunds are not issued for change-of-mind after successful package download or incompatibility with unlisted hardware/software requirements.`
      },
      {
        title: '3. Licensing & Permitted Usage',
        content: `Purchasing or downloading digital products grants you a non-exclusive, non-transferable worldwide license based on the specific product tier:
• Standard Commercial License: Allows use in unlimited personal projects and up to 5 end commercial client projects.
• Extended Enterprise License: Permits unlimited commercial applications, SaaS integration, and internal team distribution.
• Resale Restriction: Re-distributing, sub-licensing, or selling raw source files, design tokens, or standalone binaries on third-party marketplaces is strictly prohibited.`
      },
      {
        title: '4. Software Updates & Compatibility',
        content: `Upper Store guarantees free lifetime minor version updates (e.g. v1.x to v1.y) for purchased digital items. Major version upgrades (e.g. v1.x to v2.x) may be offered at a discounted upgrade price for existing license holders.`
      }
    ]
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How Upper Store collects, safeguards, and respects your personal information.',
    iconComponent: LockIcon,
    sections: [
      {
        title: '1. Information We Collect',
        content: `We collect minimal necessary data to operate our official platform:
• Contact Information: Email address and name provided when submitting support inquiries, feedback, or ban appeals.
• System & Diagnostic Data: IP address, browser type, device information, and download timestamps collected automatically for rate-limiting, security monitoring, and anti-abuse safeguards.
• Account Credentials: Cryptographically hashed passwords (via bcrypt) for administrative or registered user sessions.`
      },
      {
        title: '2. How We Store & Secure Data',
        content: `Your data is processed and secured using modern cloud infrastructure:
• Real-time Databases: Encrypted at rest and in transit via Firebase Firestore (TLS 1.3).
• Media & CDN Storage: Visual branding, logos, and screenshots are served securely via ImageKit CDN.
• Binary Package Integrity: Application installers (.apk / .exe) are delivered through SSL-encrypted GitHub Release repositories.
• Zero Unencrypted Relays: Inbound support inquiries and ban appeals are stored in encrypted database collections with restricted admin-only access.`
      },
      {
        title: '3. Cookies & Local Storage Disclosure',
        content: `Upper Store uses local storage and essential cookies strictly to maintain user authentication state, active theme preferences, and cart sessions:
• Strictly Necessary: Session tokens (e.g. upper_user_token) required for authenticated features, reviews, and download verification.
• Functional Preferences: LocalStorage keys for sound/visual boosters, dark mode, and UI accessibility settings.
We do not sell user data to advertising networks, profile users across external platforms, or employ intrusive third-party tracking pixels.`
      },
      {
        title: '4. Third-Party Data Disclosures & No-Sale Pledge',
        content: `We do not sell, rent, monetize, or trade your personal information to data brokers or advertisers. We disclose data only when legally required by law enforcement compliance or to protect Upper Store infrastructure against malicious cyber threats.`
      },
      {
        title: '5. Data Retention & Automatic Purge Schedule',
        content: `Personal data is retained only as long as necessary to fulfill operational obligations:
• Support & Contact Messages: Inactive support tickets and contact submissions are automatically purged after 180 days.
• Download Tracking: Metrics are stored as aggregate numerical counters; individual IP download logs are rotated and purged periodically.
• Account Data: Maintained as long as your account remains active.`
      },
      {
        title: '6. User Data Rights (GDPR & DPDP Act Compliance)',
        content: `Under global privacy frameworks, including India's Digital Personal Data Protection (DPDP) Act and the General Data Protection Regulation (GDPR), you have the right to access, rectify, or request complete erasure of your personal data.
To request account deletion or data extraction, submit a request via our Contact page or email upper.official.in@gmail.com. Verified deletion requests are executed within 14 calendar days.`
      }
    ]
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    subtitle: 'The legal agreement governing your access to and use of Upper Store services.',
    iconComponent: TermsIcon,
    sections: [
      {
        title: '1. Acceptance of Terms & Eligibility',
        content: `By accessing, browsing, or downloading items from Upper Store (including associated subdomains and endpoints), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Service. You affirm that you are at least 18 years of age or possess legal parental consent to access these services.`
      },
      {
        title: '2. User Misuse & Zero Financial Liability Shield',
        content: `Upper Store, its platform operators, creators, and developers hold ZERO financial, legal, or monetary liability under any circumstances for any user's misuse, modification, misrepresentation, or misleading redistribution of our software or products.
The user bears 100% full personal, legal, and financial responsibility for their actions, must provide complete explanation for any misleading activity, and may undergo formal legal procedures. Upper Store will not pay any amount of money or compensation to anyone for any user's misuse of our products.`
      },
      {
        title: '3. Verification & Monetary Refund Guarantee',
        content: `Upper Store will issue a full refund if a monetary-related error or financial mistake occurs directly from our side, subject to administrative verification and valid proof of transaction.`
      },
      {
        title: '4. Account Termination & Suspension Rights',
        content: `Upper Store reserves the absolute right to suspend or terminate any user account, API access, or download privileges at any moment without prior notice if we detect suspicious activity, rate-limit evasion, automated scraping, abusive reviews, or platform policy breaches.`
      },
      {
        title: '5. Software Integrity & Cryptographic SHA-256 Checksums',
        content: `All executable application packages (.apk, .exe, .zip) hosted or linked via Upper Store are provided with cryptographic SHA-256 checksums. Users are explicitly instructed to verify the SHA-256 hash displayed in the product modal against their local file before execution. Upper Store disclaims all liability for package tampering, unauthorized third-party mirrors, or network-level modifications outside of our verified distribution endpoints.`
      },
      {
        title: '6. Comprehensive "AS-IS" & Statutory Warranty Disclaimer',
        content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SOFTWARE, SERVICES, AND ASSETS ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. UPPER STORE DOES NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM HARMFUL COMPONENTS.`
      },
      {
        title: '7. Cap on Aggregate Monetary Liability',
        content: `IN NO EVENT SHALL UPPER STORE, ITS DIRECTORS, EMPLOYEES, AFFILIATES, OR DEVELOPERS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM THE USE OF OR INABILITY TO USE OUR SERVICES OR SOFTWARE. UPPER STORE'S TOTAL AGGREGATE LIABILITY UNDER ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO UPPER STORE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR FIFTY US DOLLARS ($50 USD), WHICHEVER IS LESS.`
      },
      {
        title: '8. DMCA Copyright & Intellectual Property Takedown Procedure',
        content: `Upper Store respects intellectual property rights and operates under the DMCA Safe Harbor framework. If you believe your copyrighted software, design kit, or asset has been listed without authorization, please submit a formal takedown notice to our designated agent at upper.official.in@gmail.com containing:
1. Identification of the copyrighted work claimed to have been infringed.
2. Direct URL or catalog title of the material to be removed.
3. Your full legal name, company name, address, and email.
4. A statement of good faith belief that the disputed use is unauthorized.
5. A statement under penalty of perjury that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner.
Valid notices will be acted upon within 48 to 72 business hours.`
      },
      {
        title: '9. Governing Law & Dispute Jurisdiction',
        content: `These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any legal suit, action, or proceeding arising out of or related to Upper Store shall be instituted exclusively in the competent courts of India.`
      }
    ]
  },
  conduct: {
    id: 'conduct',
    title: 'Code of Conduct',
    subtitle: 'Our community standards, ethical developer guidelines, and anti-piracy pledge.',
    iconComponent: ShieldIcon,
    sections: [
      {
        title: '1. Ethical Usage & Developer Integrity',
        content: `Users and developers interacting with Upper Store services, API endpoints, or public communities agree to maintain high standards of integrity. Reverse engineering, decompiling applications for malicious distribution, or injecting unauthorized telemetry scrapers, keyloggers, bundled adware, or crypto-miners into distribution packages is strictly prohibited.`
      },
      {
        title: '2. Anti-Piracy & Unauthorized Mirroring',
        content: `We actively enforce copyright protection against unauthorized mirror websites, pirate forums, and automated scrapers. Official releases must only be downloaded directly from Upper Store or verified GitHub Release mirrors. Redistributing raw application binaries without developer authorization is grounds for immediate permanent ban.`
      },
      {
        title: '3. Community Respect & Zero-Tolerance Harassment',
        content: `Upper Store values respectful, professional communication. Harassment, abusive reviews, spam, hate speech, or defamation directed at support staff, developers, or community members will result in immediate termination of account access and service support.`
      },
      {
        title: '4. Account Ban Enforcement & Human Review Appeal Process',
        content: `Accounts violating platform policies, attempting automated API abuse, or submitting deceptive software packages will be banned. Banned accounts are restricted from downloading software or submitting product reviews.
Suspended users may submit an appeal via the Contact page once every 7 calendar days. All ban appeals are reviewed by human platform administrators within 5 business days.`
      },
      {
        title: '5. Responsible Security Vulnerability Disclosure',
        content: `We encourage responsible security disclosure. If you discover a potential vulnerability in our APIs, CDN infrastructure, or authentication systems, please report it directly to upper.official.in@gmail.com. We acknowledge security researchers promptly and commit to swift remediation.`
      }
    ]
  }
};

const Policies = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('store');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSection, setCopiedSection] = useState(null);

  // Sync tab with URL hash or default & scroll page to top
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && POLICIES_DATA[hash]) {
      setActiveTab(hash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.hash]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/policies#${tabKey}`, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(idx);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const currentPolicy = POLICIES_DATA[activeTab];
  const CurrentIcon = currentPolicy.iconComponent;

  // Filter sections by search query
  const filteredSections = currentPolicy.sections.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
  });

  return (
    <div className="policies-page-container">
      {/* HEADER HERO */}
      <header className="policies-header">
        <div className="policies-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Legal & Governance Center
        </div>
        <h1>Store <span className="gold-highlight">Policies</span> & Terms</h1>
        <p className="policies-subtitle">
          Transparent standards, licensing terms, privacy commitments, and customer guarantees for Upper Store.
        </p>

        {/* Global Policy Search Bar */}
        <div className="policies-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search within policies (e.g., refund, license, data, security)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="policies-tabs-nav">
        {Object.keys(POLICIES_DATA).map((key) => {
          const item = POLICIES_DATA[key];
          const IconComp = item.iconComponent;
          return (
            <button
              key={key}
              className={`policy-nav-tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => handleTabChange(key)}
            >
              <span className="tab-icon"><IconComp /></span>
              <span className="tab-label">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* POLICY CONTENT AREA */}
      <div className="policies-content-card">
        <div className="policy-meta-bar">
          <div className="meta-left">
            <span className="policy-big-icon">
              <CurrentIcon />
            </span>
            <div>
              <h2>{currentPolicy.title}</h2>
              <p>{currentPolicy.subtitle}</p>
            </div>
          </div>
          <div className="meta-right">
            <span className="last-updated-badge">Last Revised: Oct 1, 2026</span>
            <button className="print-policy-btn" onClick={() => window.print()} title="Print or Save PDF">
              <PrinterIcon /> Print PDF
            </button>
          </div>
        </div>

        <hr className="policy-divider" />

        {/* SECTIONS LIST */}
        {filteredSections.length === 0 ? (
          <div className="policy-no-results">
            <p>No clauses matching "<strong>{searchQuery}</strong>" found in {currentPolicy.title}.</p>
            <button onClick={() => setSearchQuery('')} className="reset-search-link">Reset Search</button>
          </div>
        ) : (
          <div className="policy-sections-wrapper">
            {filteredSections.map((sec, idx) => (
              <div key={idx} className="policy-section-block">
                <div className="section-header">
                  <h3>{sec.title}</h3>
                  <button
                    className="copy-clause-btn"
                    onClick={() => handleCopyText(`${sec.title}\n\n${sec.content}`, idx)}
                  >
                    {copiedSection === idx ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckIcon size={12} /> Copied
                      </span>
                    ) : (
                      <>
                        <CopyIcon /> Copy Clause
                      </>
                    )}
                  </button>
                </div>
                <div className="section-body">
                  {sec.content.split('\n').map((line, lineIdx) => (
                    <p key={lineIdx}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER DIRECT CHANNEL CONTACT */}
        <div className="policy-contact-box">
          <div className="contact-box-left">
            <h4>Questions regarding our policies?</h4>
            <p>Our legal and support operations team is available for licensing assistance and policy clarification.</p>
          </div>
          <div className="contact-box-right">
            <a href="mailto:upper.official.in@gmail.com" className="policy-contact-btn">
              Email Support Team
            </a>
            <a href="mailto:upper.official.in@gmail.com" className="policy-contact-btn gold">
              Contact Legal Counsel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policies;

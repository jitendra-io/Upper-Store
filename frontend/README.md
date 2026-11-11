# Upper Store - Frontend Architecture & User Interface

The Upper Store frontend is a single-page web application built with React 19 and Vite 8, featuring an Obsidian and Antique Gold design system, glassmorphic card surfaces, fluid responsive typography, an interactive HTML5 Canvas particle engine, and client-side pre-flight security tools.

---

## 1. Key Technologies

- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8 (`@vitejs/plugin-react`)
- **Routing**: React Router DOM v7
- **Typography**: Google Fonts 'Outfit' with system sans-serif fallback
- **Graphics Engine**: Native HTML5 Canvas 2D particle simulation with mouse repulsion physics
- **Security Engine**: Web Crypto API for client-side SHA-256 calculation and raw Deflate stream decompression (`DecompressionStream`)

---

## 2. Directory Structure

```
frontend/src/
├── assets/                 # Brand assets, payment QR codes, VIP badge art
├── components/             # Reusable UI components and modal sheets
│   ├── AuthModal.jsx / .css              # Authentication (Email, Password, Google OAuth)
│   ├── CancelSubscriptionModal.jsx       # VIP plan cancellation modal
│   ├── CheckoutModal.jsx / .css          # Cart and direct checkout modal
│   ├── CrystalCore3D.jsx / .css          # 3D interactive accent component
│   ├── DeveloperDownloadsModal.jsx / .css# Developer downloads metric viewer
│   ├── DeveloperStudioModal.jsx / .css   # VIP publisher studio with pre-flight scanner
│   ├── DownloadHistoryModal.jsx / .css   # User download history viewer
│   ├── EditProfileModal.jsx / .css       # Display name and bio editor
│   ├── Footer.jsx / .css                 # Site footer with directory links
│   ├── GlobalSearchModal.jsx / .css      # Omnisearch modal for catalog and developers
│   ├── Icons.jsx                         # Lightweight inline SVG icon library
│   ├── MiniFooter.jsx / .css             # Compact footer for subpages
│   ├── Navbar.jsx / .css                 # Glassmorphic top navigation bar
│   ├── ProductDetailModal.jsx / .css     # Deep-dive product preview with permissions button
│   ├── ProductPermissionsModal.jsx / .css# Interactive permissions sheet (desktop modal / mobile bottom sheet)
│   ├── ProductReviewsModal.jsx / .css    # Star ratings and customer reviews
│   ├── TermsAcceptanceModal.jsx / .css   # Statutory DPDP / GDPR consent dialog
│   ├── UserLicensesModal.jsx / .css      # Offline license key vault
│   ├── VipAvatar.jsx / .css              # Animated avatar ring (Gold Pro / Crimson Elite)
│   ├── VipClubModal.jsx / .css           # VIP membership purchase and UTR verification
│   ├── VipPromoBanner.jsx / .css         # Promotional banner for membership perks
│   └── VipUsernameModal.jsx / .css       # VIP custom handle editor with 2x/year quota
├── config/
│   └── firebase.js                       # Client-side Firebase configuration
├── context/
│   └── AuthContext.jsx                   # User session context, inactivity timeout, status sync
├── pages/
│   ├── About.jsx / .css                  # Company narrative and platform philosophy
│   ├── AdminDashboard.jsx / .css         # Admin moderation, product CRUD, and telemetry
│   ├── AdminLogin.jsx / .css             # Admin login interface
│   ├── Blog.jsx / .css                   # Platform articles and release updates
│   ├── Contact.jsx / .css                # Inquiries, support, and statutory ban appeals
│   ├── DeveloperProfile.jsx / .css       # Public developer portfolio page
│   ├── Faq.jsx / .css                    # Frequently asked questions
│   ├── Home.jsx / .css                   # Hero landing page with feature cards
│   ├── Policies.jsx / .css               # Terms of Service, Privacy Policy, DMCA, and legal
│   ├── Press.jsx / .css                  # Media kit and press releases
│   ├── ProductDetail.jsx / .css          # Standalone product route
│   ├── Products.jsx / .css               # Main catalog grid with category filters
│   └── VipClub.jsx / .css                # VIP tier comparison and benefits landing page
├── utils/
│   ├── countries.js                      # International dial codes and country list
│   ├── downloadTracker.js                # Download event tracker with localStorage fallback
│   ├── preflightScanner.js               # Client-side binary verification & range inspection
│   └── vipValidator.js                   # Unified VIP membership validation helper
├── App.jsx / .css                        # Root routing and global layout container
├── BackgroundAnimation.jsx / .css        # Free-floating canvas particle system
├── index.css                             # Global resets, color tokens, and utility classes
└── main.jsx                              # Application entry point with console safeguards
```

---

## 3. Core Subsystems

### 3.1 Pre-Flight Security Scanner (`preflightScanner.js`)
- **Local Binary Inspection**:
  - Computes authentic SHA-256 hashes inside the browser using `crypto.subtle.digest` via chunked array buffers (zero network bandwidth consumed).
  - Unzips APK archives directly in memory using standard ZIP Central Directory end-of-directory structures.
  - Decompresses `AndroidManifest.xml` via native `DecompressionStream('deflate-raw')` and extracts the Android Binary XML string pool (`0x001C0001` chunk).
- **Remote Asset Inspection Fallback**:
  - Calls Cloudflare Worker (`/inspect`) or backend proxy (`POST /api/products/inspect-remote`) with HTTP Range requests (`bytes=0-65535` and central directory tail).
  - Fetches ~130 KB of data for a 200 MB+ APK to extract actual declared permissions without downloading the complete binary.

### 3.2 Product Permissions Interface (`ProductPermissionsModal.jsx`)
- **Contextual Access**: Replaces static, space-consuming permission lists with an on-demand "Permissions" action button located inside the product detail modal.
- **Inline Drawer Preview**: Quickly expands the first 3 declared permissions directly in the product specifications bar.
- **Responsive Sheet**:
  - Desktop: Centered modal dialog with a search filter.
  - Mobile: Sliding touch-friendly bottom sheet with drag handle, smooth spring transitions, and full height scroll.
- **Transparent Labelling**: Displays actual permission names, Android manifest identifiers (`android.permission.*`), and factual functional explanations without misleading danger badges.

### 3.3 Authentication & Session Management (`AuthContext.jsx`)
- Supports email/password credentials and Google OAuth.
- Implements 30-minute idle session auto-logout for shared or public workstations.
- Syncs user role, VIP membership status, and ban flags across all active views.

---

## 4. Development & Build Commands

```bash
# Install frontend dependencies
npm install

# Run local development server (with HMR)
npm run dev

# Run production build (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

---

## 5. Production Optimization Notes

- **Source Maps**: Disabled in production (`build.sourcemap: false`) to safeguard client code.
- **Console Cleaning**: `esbuild.pure` drops `console.log` statements in production bundles.
- **Self-XSS Protection**: Production runtime outputs a prominent console deterrent warning users against pasting untrusted code into the browser console.

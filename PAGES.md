# Upper Store - Complete Frontend Pages & Popups Architecture

This document provides a comprehensive inventory and functional specification of every frontend page, route, view, popup modal, drawer overlay, and dropdown menu in the Upper Store web application.

---

## 1. Frontend Route Pages Inventory

Upper Store features 16 dedicated route pages managed by React Router v6 in `frontend/src/App.jsx`.

| Route | Page Component | File Path | Access Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `Home` | `frontend/src/pages/Home.jsx` | Public | Primary storefront landing page featuring the 3D Crimson Core, featured products, category highlights, and VIP preview. |
| `/products` | `Products` | `frontend/src/pages/Products.jsx` | Public | Complete software catalog with live search, category filtering, sorting, and responsive pagination. |
| `/products/:id` | `ProductDetail` | `frontend/src/pages/ProductDetail.jsx` | Public | Deep-linked dedicated product page displaying detailed software specs, screenshots, checksums, and reviews. |
| `/developer-studio`<br>`/studio`<br>`/developer/studio`<br>`/dev/studio` | `DeveloperStudio` | `frontend/src/pages/DeveloperStudio.jsx` | VIP Member | Full-page VIP Developer Studio suite for catalog publishing, pre-flight security audits, product management, community broadcasts, and statutory DPDP consent. |
| `/vip`, `/vip-club` | `VipClub` | `frontend/src/pages/VipClub.jsx` | Public / Auth | VIP Club membership landing page detailing exclusive developer perks, custom handles, pricing, and subscription actions. |
| `/developer/:username`<br>`/developers/:username`<br>`/dev/:username` | `DeveloperProfile` | `frontend/src/pages/DeveloperProfile.jsx` | Public / Owner | Dynamic developer showcase page displaying cover banner, avatar, follower counts, bio, social links, and published software catalog. |
| `/about` | `About` | `frontend/src/pages/About.jsx` | Public | About Upper Store, engineering principles, zero-trust security guarantees, SHA-256 validation policy, and core team info. |
| `/contact` | `Contact` | `frontend/src/pages/Contact.jsx` | Public | Direct inquiry and customer support portal dispatching messages straight to encrypted Firebase Firestore for guaranteed delivery. |
| `/faq` | `Faq` | `frontend/src/pages/Faq.jsx` | Public | Interactive accordion help center answering questions regarding installation, APK sideloading, VIP membership, and safety. |
| `/blog` | `Blog` | `frontend/src/pages/Blog.jsx` | Public | Engineering articles, software releases, security writeups, and changelogs with an integrated full-text article reader modal. |
| `/press` | `Press` | `frontend/src/pages/Press.jsx` | Public | Brand media kit, official logo packages, brand color palette tokens, typography rules, and press inquiry guidelines. |
| `/policies` | `Policies` | `frontend/src/pages/Policies.jsx` | Public | Legal compliance document covering Store Policies, Terms of Service, Code of Conduct, DPDP Privacy Policy, and Grievance Redressal. |
| `/admin` | `AdminLogin` | `frontend/src/pages/AdminLogin.jsx` | Public / Admin | Secure administrator login portal authenticating credentials against backend JWT admin endpoints. |
| `/admin/dashboard` | `AdminDashboard` | `frontend/src/pages/AdminDashboard.jsx` | Admin Session | Full administrative control suite containing 10 operational management tabs and live telemetry. |
| `/axon`, `/motion` | `AxonMotionHub` | `frontend/src/pages/AxonMotionHub.jsx` | Public | Real-time motion research hub featuring a 262,144 GPU particle cloud sculpted form, GPU fluid simulation cursor interaction, video research cards, and monospace UI. |
| `/404`, `*` (catch-all) | `NotFound` | `frontend/src/pages/NotFound.jsx` | Public | 404 Not Found error page featuring the rotating 3D crimson crystal orb, `404 NOT FOUND` heading, and Return to Home action. |
| `/403`, `/forbidden` | `Forbidden` | `frontend/src/pages/Forbidden.jsx` | Public | 403 Forbidden error page featuring the rotating 3D crimson crystal orb, `403 FORBIDDEN` heading, and Return to Home action. |

---

## 2. Detailed Page Specifications

### 2.1. Home (`/`)
- **File**: `frontend/src/pages/Home.jsx`
- **Styling**: `frontend/src/pages/Home.css`
- **Core Elements**:
  - Hero section with gradient headline, live value propositions, and Call-To-Action buttons ("Explore Products", "Join VIP Club").
  - Interactive 3D Crimson Crystalline Neural Core (`CrystalCore3D.jsx`): Real-time Three.js faceted crystal mesh, rotating outer wireframe cage, orbiting particle halo, ambient crimson lighting, and interactive mouse/touch drag physics.
  - Floating Telemetry Cards: Global CDN status, 99.05% uptime pill, pre-publish sandbox verification badge, and SHA-256 verification indicator.
  - Featured Applications Grid: Product cards with instant modal view triggers.
  - VIP Club Promotional Showcase banner (`VipPromoBanner.jsx`).
  - Trust and Security Pillars: Client-side checksum validation, ImageKit CDN media delivery, and secure downloads.
- **Popups Triggerable**:
  - `ProductDetailModal`: Clicking any featured product card.
  - `ProductReviewsModal`: Clicking the review counter or star rating badge.
  - `GlobalSearchModal`: Triggered via keyboard shortcut (`Ctrl+K`) or search button.
  - `AuthModal`: Triggered if user attempts gated actions while unauthenticated.

### 2.2. Products (`/products`)
- **File**: `frontend/src/pages/Products.jsx`
- **Styling**: `frontend/src/pages/Products.css`
- **Core Elements**:
  - Search query bar with real-time debounced query filtering.
  - Category selector tabs (All, Utilities, Android, Windows, Dev Tools, System, AI).
  - Mobile category filter collapsible drawer (`mobileFilterOpen`).
  - Sort selection dropdown (Most Popular, Newest Releases, Highest Rated, Name A-Z).
  - Product Card Grid: Displaying software icon, title, version, developer handle, star ratings (`StarRatingBadge.jsx`), pricing tag, and quick-view button.
  - Pagination navigation controls for browsing large catalogs.
- **Popups Triggerable**:
  - `ProductDetailModal`: Clicking any product card.
  - `ProductReviewsModal`: Clicking customer review stars.
  - `GlobalSearchModal`: Global shortcut.
  - `AuthModal`: Gated downloads or developer interactions.

### 2.3. Product Detail (`/products/:id`)
- **File**: `frontend/src/pages/ProductDetail.jsx`
- **Styling**: `frontend/src/pages/ProductDetail.css`
- **Core Elements**:
  - Deep-linkable standalone product route rendering the full software showcase.
  - Embeds and mounts `ProductDetailModal` as the primary viewport experience.
  - Handles direct route navigation, URL sharing, and automated history cleanups.
- **Popups Triggerable**:
  - `TermsAcceptanceModal`: Triggered prior to binary downloading.
  - `CheckoutModal`: Triggered for paid software packages or monetization licenses.
  - `ProductPermissionsModal`: Triggered when inspecting application permissions.
  - `ProductReviewsModal`: Triggered when opening all customer ratings and feedback.
  - `VipClubModal`: Triggered when VIP-exclusive features or discounts are clicked.
  - `AuthModal`: Prompted if an unauthenticated user initiates a download.

### 2.4. VIP Club (`/vip`, `/vip-club`)
- **File**: `frontend/src/pages/VipClub.jsx`
- **Styling**: `frontend/src/pages/VipClub.css`
- **Core Elements**:
  - High-impact membership banner with glowing crimson and gold styling.
  - VIP Privileges Grid: Unlimited high-speed CDN downloads, Verified Developer Studio access, early access to beta software, priority support, and exclusive username reservation.
  - Tier Comparison & Pricing Matrix.
  - Live VIP subscriber counter and community showcase.
  - Interactive Action Panel: Shows membership status for active subscribers, or checkout button for new members.
- **Popups Triggerable**:
  - `VipClubModal`: Clicking "Join VIP Club" or "Upgrade Now".
  - `CancelSubscriptionModal`: For active VIP members wishing to manage or cancel subscriptions.
  - `VipUsernameModal`: For VIP members claiming or changing their exclusive handle.
  - `DeveloperStudioModal`: For VIP members accessing their developer publishing studio.
  - `AuthModal`: For guests attempting to subscribe.

### 2.5. Developer Profile (`/developer/:username`, `/developers/:username`, `/dev/:username`)
- **File**: `frontend/src/pages/DeveloperProfile.jsx`
- **Styling**: `frontend/src/pages/DeveloperProfile.css`
- **Core Elements**:
  - Developer Cover Banner with responsive focal positioning (`objectPosition`) stored on backend/ImageKit.
  - Developer Avatar (`VipAvatar.jsx`) with VIP badge and verified checkmark.
  - Header actions: Follow/Unfollow button with optimistic state updates, and Edit Profile button (if owner).
  - Social connectivity links: Personal Website, GitHub, Twitter/X, Instagram.
  - Developer Bio and statistics summary (Followers, Following, Total Published Apps).
  - Developer's Published Catalog: Interactive grid of software released by this developer.
  - Owner-Only Telemetry: Private downloads counter and detailed analytics button.
- **Popups Triggerable**:
  - `EditProfileModal`: Owner editing avatar, banner, drag position, bio, and social handles.
  - `DeveloperDownloadsModal`: Owner inspecting private per-product download logs and trends.
  - `DeveloperFollowModal`: Clicking followers or following counters to inspect user lists.
  - `ProductDetailModal`: Clicking any published software card.
  - `AuthModal`: Guests clicking the Follow button.

### 2.6. About (`/about`)
- **File**: `frontend/src/pages/About.jsx`
- **Styling**: `frontend/src/pages/About.css`
- **Core Elements**:
  - Mission statement and platform philosophy.
  - Security architecture breakdown (SHA-256 cryptographic verification, sandboxing, zero malware tolerance).
  - Technology stack showcase (Three.js WebGL, React, Express, Firebase Firestore, ImageKit CDN).
  - Engineering and leadership team introductions.
- **Popups Triggerable**:
  - `GlobalSearchModal`
  - `AuthModal`

### 2.7. Contact (`/contact`)
- **File**: `frontend/src/pages/Contact.jsx`
- **Styling**: `frontend/src/pages/Contact.css`
- **Core Elements**:
  - Direct inquiry form (Full Name, Email Address, Subject Category, Message Body).
  - Direct Firebase Firestore ingestion: Ensures messages bypass cloud SMTP restrictions (e.g. cloud port blocks) for guaranteed real-time delivery to the Admin Dashboard Inbox.
  - Real-time submission status banners (loading spinner, success confirmation, error alerts).
  - Official support channels, response ETA guarantee, and grievance officer details.
- **Popups Triggerable**:
  - `GlobalSearchModal`
  - `AuthModal`

### 2.8. FAQ (`/faq`)
- **File**: `frontend/src/pages/Faq.jsx`
- **Styling**: `frontend/src/pages/Faq.css`
- **Core Elements**:
  - Interactive accordion question-and-answer list with animated SVG chevrons.
  - Key Topics: Windows software execution, Android APK sideloading safety, VIP membership billing, refund policy, and developer submission guidelines.
  - Support escalation CTA leading directly to the Contact page.
- **Popups Triggerable**:
  - `GlobalSearchModal`
  - `AuthModal`

### 2.9. Blog (`/blog`)
- **File**: `frontend/src/pages/Blog.jsx`
- **Styling**: `frontend/src/pages/Blog.css`
- **Core Elements**:
  - Featured spotlight article with hero image and summary.
  - Category filter pills (Engineering, Security, Releases, Tutorials).
  - Article cards grid showing publish dates, estimated reading time, author, and tags.
  - Full-text reading experience embedded via the Article Reader Modal.
- **Popups Triggerable**:
  - `Article Reader Modal`: Portal overlay displaying the full article text, high-res images, and author metadata.
  - `GlobalSearchModal`
  - `AuthModal`

### 2.10. Press (`/press`)
- **File**: `frontend/src/pages/Press.jsx`
- **Styling**: `frontend/src/pages/Press.css`
- **Core Elements**:
  - Official media kit and high-resolution logo asset packages.
  - Brand identity guidelines, official crimson color palette values, and typography specifications.
  - Press release announcements and company milestones.
  - Direct contact email for press and media relations.
- **Popups Triggerable**:
  - `GlobalSearchModal`
  - `AuthModal`

### 2.11. Policies (`/policies`)
- **File**: `frontend/src/pages/Policies.jsx`
- **Styling**: `frontend/src/pages/Policies.css`
- **Core Elements**:
  - Anchored multi-section compliance document:
    - `#store`: Store Policies and Distribution Guidelines.
    - `#terms`: Terms of Service and End-User Agreement.
    - `#conduct`: Developer Code of Conduct and Anti-Malware Safeguards.
    - `#privacy`: Privacy Policy compliant with India DPDP Act 2023.
    - `#grievance`: Grievance Redressal Mechanism, Officer Name, and contact workflow.
  - Table of contents with smooth scroll navigation.
- **Popups Triggerable**:
  - `GlobalSearchModal`
  - `AuthModal`

### 2.12. Admin Login (`/admin`)
- **File**: `frontend/src/pages/AdminLogin.jsx`
- **Styling**: `frontend/src/pages/AdminLogin.css`
- **Core Elements**:
  - Secure administrator login card in obsidian and crimson theme.
  - Username and password inputs with auto-complete prevention.
  - Form validation with error message banner.
  - Authenticates via `POST /api/auth/login` and saves `adminToken` in localStorage before redirecting to `/admin/dashboard`.

### 2.13. Admin Dashboard (`/admin/dashboard`)
- **File**: `frontend/src/pages/AdminDashboard.jsx`
- **Styling**: `frontend/src/pages/AdminDashboard.css`
- **Core Elements**:
  - Protected single-page dashboard accessible only with verified admin authorization.
  - Top navigation bar with admin identity, unread inbox counter, and Logout button.
  - 10 Operational Management Panels (described in Section 3 below).
- **Popups Triggerable**:
  - `Admin User Activity Detail Modal`: Inspecting full user telemetry.
  - `Admin Reject Payment Reason Modal`: Declining pending manual payments.
  - `Banner Position Adjustment Panel`: Repositioning the official store cover banner.

### 2.14. 404 Not Found (`/404` and `*`)
- **File**: `frontend/src/pages/NotFound.jsx`
- **Styling**: `frontend/src/pages/ErrorPage.css`
- **Core Elements**:
  - Catch-all route for any unmapped URL or explicit `/404`.
  - Displays the rotating 3D Crimson Crystalline Neural Core in minimal mode (`CrystalCore3D.jsx minimal={true}`).
  - Bold glowing headline: `404 NOT FOUND`.
  - Subtle glassmorphic "Return to Home" button.
  - Multi-column footer is suppressed to preserve pure minimalist focus on the rotating orb.

### 2.15. 403 Forbidden (`/403` and `/forbidden`)
- **File**: `frontend/src/pages/Forbidden.jsx`
- **Styling**: `frontend/src/pages/ErrorPage.css`
- **Core Elements**:
  - Dedicated forbidden access route for unauthorized areas or suspended sessions.
  - Displays the rotating 3D Crimson Crystalline Neural Core in minimal mode (`CrystalCore3D.jsx minimal={true}`).
  - Bold glowing headline: `403 FORBIDDEN`.
  - Subtle glassmorphic "Return to Home" button.
  - Multi-column footer is suppressed to preserve pure minimalist focus on the rotating orb.

### 2.16. Axon Motion Research Hub (`/axon`, `/motion`)
- **File**: `frontend/src/pages/AxonMotionHub.jsx`
- **Styling**: `frontend/src/pages/AxonMotionHub.css`
- **Core Elements**:
  - Full-screen dark research page with pure black background (`#000000`).
  - GPGPU Particle Cloud: 262,144 points on desktop (16,384 on mobile) forming a sculpted organic logo form (bent hollow ring/torus with lobes).
  - GPU Fluid Simulation: Real-time Navier-Stokes simulation on half-float ping-pong targets stirring particles on cursor motion with camera gaze lerping.
  - Monospace UI Layer (`mix-blend-mode: plus-lighter`):
    - Brand: 40x40 SVG mark (18.5px circle and 8-point star) with "AXON" and "Motion research" subtitle.
    - Counter: 44x44 circle with border, `#0a0a0a` background, and centered "07".
    - 10 Tag Chips: All, Light, Physics, Fluids, Grid, Audio, Volumes, Particles, Capture, Render.
    - 4 Autoplay Muted Loop Video Cards with metadata: Lattices / zone, Prism / shell, Nebular / loop, Fall / forward.
    - Right Text Column: [info], [aims], [exploring], [connect] copy.
  - Interactive Theme Toggle: Supports switching between AXON Original Violet (`#aa88ff`) and Upper Store Crimson (`#ff2a2a`).
  - Responsive: Hides card list and chips on `<= 760px` with left-aligned bottom text column.

---

## 3. Admin Dashboard Management Panels & Views

The Admin Dashboard (`AdminDashboard.jsx`) consists of 10 modular sub-views toggled via `activeTab`:

| Tab Key | Tab Label | Description & Administrative Functions |
| :--- | :--- | :--- |
| `products` | Products Management | View all catalog software, upload new applications, edit version/metadata, update SHA-256 checksums, toggle public approval, and delete products. |
| `developers` | Developers & KYC | Review developer application requests, inspect submitted DPDP/KYC documents, approve/reject developer publishing status, and revoke access. |
| `users` | User Directory | Search registered users, filter standard vs VIP subscribers, view registration and login dates, toggle VIP status, ban users, and open the User Activity Detail Modal. |
| `appeals` | Grievance & Appeals | Inspect user appeals regarding account restrictions, review grievance submissions, resolve issues, or dismiss appeals. |
| `inbox` | Customer Inquiries | Real-time Firebase Firestore inbox receiving messages submitted via the Contact page. View customer inquiries, reply via email, mark as read, or delete. |
| `notifications` | Global Notifications | Create and broadcast push/banner notifications to all users, active developers, or VIP members. |
| `platformFee` | Platform Fee Config | Set and adjust default platform commission percentages and developer payout thresholds. |
| `payments` | Payment Verification | Review manual UPI payments and UTR submission receipts. Approve to issue automated license keys, or trigger the Reject Payment Modal with an explanatory note. |
| `storeProfile` | Official Store Profile | Manage the official Upper Store publisher identity, handle, bio, upload official background cover banner to ImageKit CDN, and adjust vertical drag focal position. |
| `downloads` | Download Telemetry | View live download event logs, IP telemetry, user-agent details, and product popularity statistics. |

---

## 4. Complete Inventory of All Popups, Modals, Drawers & Overlays

This section documents all 26 modals, drawers, dropdown menus, and overlays across the frontend.

### 4.1. Authentication Modal
- **Component**: `AuthModal.jsx` (`frontend/src/components/AuthModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Header "Sign In" button, mobile drawer auth button, or any gated action (e.g. downloading software, following a developer, upgrading to VIP).
- **Features**:
  - Tab Switcher: "Sign In" vs "Create Account".
  - Sign In: Email/Username, Password with toggle visibility, forgot password trigger.
  - Sign Up: Full Name, unique username handle input with live validation, Email, Password, 18+ age confirmation checkbox, DPDP Act statutory consent checkbox.
  - Collapsible DPDP Privacy Notice sub-drawer (`showPrivacyNotice`) explaining data rights.
- **Dismiss**: Click on backdrop, close `X` icon, or `Escape` key.

### 4.2. Global Omnibar Search Modal
- **Component**: `GlobalSearchModal.jsx` (`frontend/src/components/GlobalSearchModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Global shortcut `Ctrl+K` / `Cmd+K`, header search icon, or mobile drawer search button.
- **Features**:
  - Fullscreen glassmorphic search interface.
  - Real-time search query filtering products by title, description, and tags.
  - Developer handle search linking directly to developer profile pages.
  - Category pill filter shortcuts.
  - Keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter` to select, `Escape` to close).
- **Dismiss**: Click outside modal container, close button, or `Escape` key.

### 4.3. Product Detail Quick View Modal
- **Component**: `ProductDetailModal.jsx` (`frontend/src/components/ProductDetailModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking any product card across Home, Products, Developer Profile, or Global Search.
- **Features**:
  - Screenshot gallery carousel with navigation arrows.
  - Developer card with avatar, handle, and profile link.
  - Software technical specs (Version, OS architecture, file size, release date).
  - SHA-256 cryptographic verification checksum with copy-to-clipboard button.
  - Action buttons: Download, Buy / Checkout, View Permissions, View Reviews.
- **Sub-Modals Launched**:
  - `TermsAcceptanceModal`
  - `CheckoutModal`
  - `ProductPermissionsModal`
  - `ProductReviewsModal`
  - `VipClubModal`
- **Dismiss**: Backdrop click, `X` close icon, or browser Back button.

### 4.4. Product Permissions & Security Modal
- **Component**: `ProductPermissionsModal.jsx` (`frontend/src/components/ProductPermissionsModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking "Permissions" inside `ProductDetailModal`.
- **Features**:
  - Comprehensive manifest permission inspection for Android (.apk) and Windows (.exe) applications.
  - Categorized permissions list (Network, Storage, Hardware, Privacy).
  - Risk tier badges (Normal, Dangerous, System) with security advisory explanations.
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.5. Product Reviews & Ratings Modal
- **Component**: `ProductReviewsModal.jsx` (`frontend/src/components/ProductReviewsModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking star rating badge on product cards or "Reviews" button inside `ProductDetailModal`.
- **Features**:
  - Average rating display and 5-star distribution chart.
  - Review submission form (interactive star rating picker, review headline, detailed feedback textarea).
  - Chronological feed of verified customer reviews with timestamps.
  - Delete review option for authenticated review authors.
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.6. Terms Acceptance & Pre-Download Modal
- **Component**: `TermsAcceptanceModal.jsx` (`frontend/src/components/TermsAcceptanceModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Initiating a download on any software package.
- **Features**:
  - Pre-download safety disclosure and distribution license agreement.
  - Requires user to confirm acceptance of software usage terms before direct binary stream initiates.
  - "Accept & Download" and "Cancel" buttons.
- **Dismiss**: Cancel button, backdrop click, or `Escape` key.

### 4.7. Checkout & Payment Modal
- **Component**: `CheckoutModal.jsx` (`frontend/src/components/CheckoutModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking "Buy License" or "Pay Developer Fee" on paid products.
- **Features**:
  - Multi-stage payment flow:
    - Step 1 (Payment Options): Dynamic UPI QR Code, UPI Intent deep-links (Google Pay, PhonePe, Paytm), and Stripe card processing. Age verification checkbox.
    - Step 2 (Verification Submission): Manual UPI UTR 12-digit transaction ID submission input for manual verification.
    - Step 3 (Success State): Displays issued software license key with copy-to-clipboard button and direct download link.
- **Dismiss**: Close icon, backdrop click, or completion action.

### 4.8. VIP Club Upgrade Modal
- **Component**: `VipClubModal.jsx` (`frontend/src/components/VipClubModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Header "VIP Club" button, VIP banners, or VIP perks triggers.
- **Features**:
  - VIP membership overview and exclusive benefits list.
  - Monthly vs Annual tier selection.
  - Razorpay / UPI integrated checkout trigger.
  - Instant VIP status activation feedback.
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.9. Cancel VIP Subscription Modal
- **Component**: `CancelSubscriptionModal.jsx` (`frontend/src/components/CancelSubscriptionModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Navbar user menu -> "Cancel VIP Subscription", or VIP Club page.
- **Features**:
  - Churn-prevention review of benefits that will be lost upon cancellation.
  - Displays subscription expiration date.
  - Reason for cancellation feedback dropdown / input.
  - Confirmation button to execute cancellation request.
- **Dismiss**: "Keep VIP" button, backdrop click, or close icon.

### 4.10. Claim VIP Username Modal
- **Component**: `VipUsernameModal.jsx` (`frontend/src/components/VipUsernameModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Navbar user menu -> "Claim VIP Username", or VIP Club page.
- **Features**:
  - Exclusive handle claim interface for active VIP subscribers.
  - Live availability checking against Firestore database.
  - Validation rules enforcement (lowercase, alphanumeric, no reserved system handles).
  - One-click handle claim and profile update.
- **Dismiss**: Backdrop click, close icon, or cancel button.

### 4.11. Developer Studio Modal
- **Component**: `DeveloperStudioModal.jsx` (`frontend/src/components/DeveloperStudioModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Navbar user menu -> "Developer Studio", or VIP Club developer CTA.
- **Features**:
  - Tab 1: Upload Product: Pre-flight client-side SHA-256 calculation, package file selector (.apk, .exe, .zip), media uploader, versioning, permissions selector, monetization model.
  - Tab 2: My Products: Catalog of uploaded software with status badges (Approved, Pending Review, Rejected) and edit forms.
  - Tab 3: Broadcast Notifications: Push notifications to all developer followers.
  - Tab 4: KYC & Compliance: DPDP Act statutory compliance, PAN/ID verification, and developer agreement.
  - Sub-Modal: `ConsentNoticeModal` (compliance consent review and revocation).
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.12. Edit Profile Modal
- **Component**: `EditProfileModal.jsx` (`frontend/src/components/EditProfileModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: "Edit Profile" button on `DeveloperProfile.jsx`.
- **Features**:
  - Unified editor for standard users and developers.
  - Avatar image uploader with ImageKit CDN integration.
  - Cover banner image uploader with ImageKit CDN hosting.
  - Interactive 2D drag repositioner to adjust cover photo vertical focal point.
  - Full Name, Bio, Website URL, GitHub, Twitter/X, and Instagram handle inputs.
- **Dismiss**: Backdrop click, close icon, or cancel button.

### 4.13. Developer Followers & Following Modal
- **Component**: `DeveloperFollowModal.jsx` (`frontend/src/components/DeveloperFollowModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking "Followers" or "Following" counters on `DeveloperProfile.jsx`.
- **Features**:
  - Tabbed interface switching between "Followers" and "Following".
  - User list cards with avatar, VIP badge, username handle, and bio.
  - Direct Follow/Unfollow action button on each user row.
  - Clickable user row navigating to the respective profile.
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.14. Developer Private Download Telemetry Modal
- **Component**: `DeveloperDownloadsModal.jsx` (`frontend/src/components/DeveloperDownloadsModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Developer Profile -> Private downloads counter (visible only to developer owner).
- **Features**:
  - Detailed product-by-product download breakdowns.
  - Time-series analytics and download metrics.
  - Recent download logs with timestamps.
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.15. User Download History Modal
- **Component**: `DownloadHistoryModal.jsx` (`frontend/src/components/DownloadHistoryModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Navbar user menu -> "My Downloads".
- **Features**:
  - Chronological list of all software packages downloaded by the authenticated user.
  - Displays product title, version, download timestamp, and verified SHA-256 checksum.
  - Direct re-download action button.
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.16. User Software Licenses Modal
- **Component**: `UserLicensesModal.jsx` (`frontend/src/components/UserLicensesModal.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Navbar user menu -> "My Licenses".
- **Features**:
  - Software license key vault for paid purchases.
  - Displays product title, order ID, purchase date, and license key.
  - One-click copy license key to clipboard.
  - Direct link to download the licensed software.
- **Dismiss**: Backdrop click, close icon, or `Escape` key.

### 4.17. Notification Center Dropdown / Popover
- **Component**: Embedded in `Navbar.jsx` (`frontend/src/components/Navbar.jsx`)
- **Trigger**: Clicking the notification bell icon in the header.
- **Features**:
  - Displays real-time unread badge counter.
  - Notification items: Follower alerts, new product updates, and system announcements.
  - Privacy enforcement: Follower notifications are visible strictly to the recipient.
  - Mark all as read button and direct navigation on notification item click.
- **Dismiss**: Clicking outside the popover, re-clicking bell icon, or route navigation.

### 4.18. User Profile Dropdown Menu
- **Component**: Embedded in `Navbar.jsx` (`frontend/src/components/Navbar.jsx`)
- **Trigger**: Clicking authenticated user avatar in the header.
- **Features**:
  - User summary: Display name, username handle, VIP status badge, and email.
  - Navigation triggers:
    - Open Developer Studio Modal
    - Open My Downloads Modal
    - Open My Licenses Modal
    - Open Claim VIP Username Modal
    - Open Cancel VIP Subscription Modal
    - Sign Out / Logout
    - Withdraw DPDP Consent & Delete Account
- **Dismiss**: Clicking outside menu, clicking an option, or route navigation.

### 4.19. Mobile Navigation Hamburger Drawer
- **Component**: Embedded in `Navbar.jsx` (`frontend/src/components/Navbar.jsx`)
- **Trigger**: Mobile hamburger menu button on viewports `<= 768px`.
- **Features**:
  - Fullscreen slide-over drawer with route links (Home, Products, VIP Club, About, FAQ, Contact, Press, Policies).
  - Search trigger button.
  - Sign In / Profile button.
  - Locks background page scrolling when active.
- **Dismiss**: Close `X` icon, clicking any navigation link, or backdrop click.

### 4.20. Mobile Category Filter Drawer
- **Component**: Embedded in `Products.jsx` (`frontend/src/pages/Products.jsx`)
- **Trigger**: "Filters" button on mobile viewports on the Products page.
- **Features**:
  - Collapsible drawer displaying all software categories (All, Utilities, Android, Windows, Dev Tools, System, AI).
  - Active category indicator and category count badges.
  - One-tap category selection with auto-close.
- **Dismiss**: Re-clicking the filter button or selecting a category.

### 4.21. Blog Article Reader Modal
- **Component**: Embedded in `Blog.jsx` (`frontend/src/pages/Blog.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking any article card on the Blog page.
- **Features**:
  - Full-screen article reading overlay.
  - Category badge, publication date, author bio.
  - Full-width hero banner image.
  - Rich scrollable article body.
- **Dismiss**: Close `X` button, backdrop click, or `Escape` key.

### 4.22. Security & Service Advisories Modal
- **Component**: Embedded in `Footer.jsx` (`frontend/src/components/Footer.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking "Security Advisories" link in the site footer.
- **Features**:
  - Detailed operational security disclosures:
    - Official Package Downloads: Cryptographic SHA-256 verification and high-speed GitHub Release endpoints.
    - Media & Image Assets: ImageKit CDN SSL delivery.
    - Customer Support Messaging: Direct Firebase Firestore bypass for 100% delivery guarantee.
- **Dismiss**: Close button, backdrop click, or `Escape` key.

### 4.23. System Status Monitor Modal
- **Component**: Embedded in `Footer.jsx` (`frontend/src/components/Footer.jsx`)
- **Portal**: Renders via `createPortal` into `document.body`.
- **Trigger**: Clicking "System Status" link in the site footer.
- **Features**:
  - Live system status indicators: API Gateway, Edge CDN, Firestore Database, and Authentication Service.
  - Overall status banner with 100% uptime badge.
- **Dismiss**: Close button, backdrop click, or `Escape` key.

### 4.24. Admin User Activity Detail Modal
- **Component**: Embedded in `AdminDashboard.jsx` (`frontend/src/pages/AdminDashboard.jsx`)
- **Trigger**: Admin clicking on any user row in the Users management tab.
- **Features**:
  - Comprehensive user telemetry: Email, UID, registration date, last login timestamp, VIP status.
  - User's complete download history.
  - User's payment records and active software licenses.
  - Danger Zone: Admin action buttons to ban user or permanently delete user account.
- **Dismiss**: Close `X` icon or clicking outside modal box.

### 4.25. Admin Reject Payment Reason Modal
- **Component**: Embedded in `AdminDashboard.jsx` (`frontend/src/pages/AdminDashboard.jsx`)
- **Trigger**: Admin clicking "Reject" on any pending payment transaction.
- **Features**:
  - Form modal requiring the admin to enter an explanation note for rejecting a manual UPI payment.
  - Rejection note is saved to the payment record and communicated to the user.
  - Confirm Rejection button.
- **Dismiss**: Cancel button, close `X` icon, or backdrop click.

### 4.26. Admin Store Banner Position Adjustment Panel
- **Component**: Embedded in `AdminDashboard.jsx` (`frontend/src/pages/AdminDashboard.jsx`)
- **Trigger**: Admin opening the Store Profile tab to adjust the official background cover banner.
- **Features**:
  - Interactive visual repositioning tool.
  - Drag-to-reposition interface allowing the admin to set the vertical focal point (`objectPosition`) in real time.
  - Desktop (1440x320) and Mobile (390x200) live aspect ratio preview toggles.
  - Save button storing updated focal coordinates on backend.
- **Dismiss**: Save changes or collapse panel.

---

## 5. Page-to-Popup Cross Reference Matrix

The following matrix maps which popups, modals, and overlays can be launched from each page:

| Page | Route | Modals & Popups Triggerable |
| :--- | :--- | :--- |
| **Home** | `/` | `ProductDetailModal`, `ProductReviewsModal`, `AuthModal`, `GlobalSearchModal`, `VipClubModal` |
| **Products** | `/products` | `ProductDetailModal`, `ProductReviewsModal`, `Mobile Category Filter Drawer`, `AuthModal`, `GlobalSearchModal` |
| **Product Detail** | `/products/:id` | `ProductDetailModal`, `TermsAcceptanceModal`, `CheckoutModal`, `ProductPermissionsModal`, `ProductReviewsModal`, `VipClubModal`, `AuthModal` |
| **VIP Club** | `/vip`, `/vip-club` | `VipClubModal`, `CancelSubscriptionModal`, `DeveloperStudioModal`, `VipUsernameModal`, `AuthModal` |
| **Developer Profile**| `/developer/:username` | `EditProfileModal`, `DeveloperDownloadsModal`, `DeveloperFollowModal`, `ProductDetailModal`, `AuthModal` |
| **Blog** | `/blog` | `Article Reader Modal`, `GlobalSearchModal`, `AuthModal` |
| **About** | `/about` | `GlobalSearchModal`, `AuthModal` |
| **Contact** | `/contact` | `GlobalSearchModal`, `AuthModal` |
| **FAQ** | `/faq` | `GlobalSearchModal`, `AuthModal` |
| **Press** | `/press` | `GlobalSearchModal`, `AuthModal` |
| **Policies** | `/policies` | `GlobalSearchModal`, `AuthModal` |
| **Admin Login** | `/admin` | Form-level validation errors (No popups) |
| **Admin Dashboard** | `/admin/dashboard` | `Admin User Activity Detail Modal`, `Admin Reject Payment Reason Modal`, `Admin Store Banner Position Adjustment Panel` |
| **404 Not Found** | `/404`, `*` | Clean minimalist layout (No popups) |
| **403 Forbidden** | `/403`, `/forbidden`| Clean minimalist layout (No popups) |
| **Global Header** | *(All Pages)* | `AuthModal`, `GlobalSearchModal`, `Notification Center Popover`, `User Profile Dropdown Menu`, `Mobile Navigation Hamburger Drawer` |
| **Global Footer** | *(Public Pages)* | `Security & Service Advisories Modal`, `System Status Monitor Modal` |

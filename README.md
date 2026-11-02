# Upper Store - Enterprise Digital Software & Artifact Distribution Platform

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-Deployed-f38020?style=flat-square&logo=cloudflare)](https://upperstore.pages.dev/)
[![Security](https://img.shields.io/badge/Security-SHA--256_Verified-10b981?style=flat-square&logo=shield)](https://upperstore.pages.dev/policies)

> **Live Deployment:** [https://upperstore.pages.dev/](https://upperstore.pages.dev/)  
> **Production Status:** Live & Fully Verified (Google Trust Services SSL / 200 OK)

---

## Table of Contents
1. [Executive Overview & Philosophy](#1-executive-overview--philosophy)
2. [High-Level Architecture & Tech Stack](#2-high-level-architecture--tech-stack)
3. [Deep-Dive Feature Breakdown](#3-deep-dive-feature-breakdown)
   - [3.1 Storefront & Catalog Experience](#31-storefront--catalog-experience)
   - [3.2 Cryptographic Integrity & Anti-Tampering Engine](#32-cryptographic-integrity--anti-tampering-engine)
   - [3.3 Upper VIP Club & Monetization Engine](#33-upper-vip-club--monetization-engine)
   - [3.4 VIP Custom Handle System (@username)](#34-vip-custom-handle-system-username)
   - [3.5 VIP Developer Studio & Publisher Workspace](#35-vip-developer-studio--publisher-workspace)
   - [3.6 Publisher Broadcast Notification Engine](#36-publisher-broadcast-notification-engine)
   - [3.7 User Download & License Vault](#37-user-download--license-vault)
   - [3.8 Unified Admin Command Portal](#38-unified-admin-command-portal)
4. [Security, Performance & Sustainability Hardening](#4-security-performance--sustainability-hardening)
5. [Firestore Database Schema & Data Models](#5-firestore-database-schema--data-models)
6. [Complete REST API Endpoint Reference](#6-complete-rest-api-endpoint-reference)
7. [Directory Structure & Codebase Map](#7-directory-structure--codebase-map)
8. [Installation & Local Development Setup Guide](#8-installation--local-development-setup-guide)
9. [Production Deployment Guide](#9-production-deployment-guide)
10. [Legal, Compliance & Statutory Framework](#10-legal-compliance--statutory-framework)
11. [License & Acknowledgments](#11-license--acknowledgments)

---

## 1. Executive Overview & Philosophy

**Upper Store** is an enterprise-grade digital software and artifact distribution platform engineered specifically for modern independent developers, power users, and security-conscious consumers.

### The Core Problem
Traditional software distribution channels are fraught with invasive telemetry, bundled adware, forced subscription lock-in, and opaque download links routed through deceitful ad-farms (e.g., Mediafire, APKPure). 

### The Upper Store Solution
* **Zero Junkware & Direct Delivery:** High-speed downloads delivered directly from GitHub Release mirrors and verified CDNs.
* **Cryptographic Verification:** Every executable (`.apk`, `.exe`, `.zip`) includes an authentic SHA-256 cryptographic checksum alongside live VirusTotal multi-engine inspection reports.
* **Obsidian & Antique Gold Luxury Aesthetic:** Built with a dark glassmorphic design system featuring fluid responsive typography, CSS blur backdrops, and an interactive HTML5 Canvas magnetic particle system.
* **Zero-Cost Sustainability:** Combines GitHub Releases binary delivery, Cloudflare edge hosting, and atomic in-memory caching to eliminate cloud storage and egress fees.

---

## 2. High-Level Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UPPER STORE ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────┤
│  CLIENT TIER (Cloudflare Pages Edge CDN - https://upperstore.pages.dev)│
│  - React 19 + Vite 8 Single Page App                                  │
│  - React Router v7 + HTML5 Canvas Particle Engine                     │
│  - CSS Glassmorphism + Responsive Touch UI (320px - 4K)                │
├────────────────────────────────────────────────────────────────────────┤
│  API & BUSINESS LOGIC (Render Web Service - Node.js 24 + Express 5)   │
│  - Role-Based Access Control (Admin / Publisher / User)                │
│  - In-Memory Anti-Stampede Single-Flight Micro-Cache (cacheService)    │
│  - Sliding-Window IP Rate Limiters (express-rate-limit)                │
│  - Multer Streaming Disk Storage + ImageKit SDK                        │
│  - SHA-256 Deterministic Security Verification Service                 │
├────────────────────────────────────────────────────────────────────────┤
│  DATA PERSISTENCE & ASSET STORAGE                                      │
│  - Database: Google Firebase Firestore (NoSQL, 10 Collections)         │
│  - Binary Distribution: GitHub Releases API (Free Multi-GB Mirroring)  │
│  - Media CDN: ImageKit.io & Google Photos Proxy                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Breakdown

| Layer | Technologies / Packages | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React `^19.2.8`, React DOM `^19.2.8` | Component architecture, reconciliation, hooks |
| **Build & Tooling** | Vite `^8.3.1`, ESBuild | Sub-second HMR and production bundle minification |
| **Routing** | React Router DOM `^7.18.4` | Client-side routing, protected routes, deep-linking |
| **Canvas Graphics** | HTML5 Canvas 2D Physics Engine | 150 magnetic golden particles with cursor repulsion |
| **Backend Runtime** | Node.js `v24.x`, Express `^5.2.1` | REST API engine, middleware pipelines, streaming |
| **Database** | Firebase Admin SDK `^14.5.0` (Firestore) | Real-time NoSQL persistence, atomic field increments |
| **Security & Auth** | JWT (`jsonwebtoken ^9.0.3`), `bcryptjs ^3.0.3` | Cryptographic Bearer token exchange, password hashing |
| **Rate Limiting** | `express-rate-limit ^8.7.1` | Sliding-window anti-brute-force and DoS protection |
| **Email & Transports** | `nodemailer ^10.0.13` | SMTP automated receipts, notifications, ban appeals |
| **Cloud Hosting** | Cloudflare Pages + Render | Global edge static delivery + autoscaling container |

---

## 3. Deep-Dive Feature Breakdown

### 3.1 Storefront & Catalog Experience
* **Dynamic Catalog Filtering:** Instant filtering across 9 primary categories:
  1. `Android Tools` (`.apk` direct install mirrors)
  2. `Windows & Desktop` (`.exe` standalone binaries)
  3. `AI Tools` (Machine learning utilities and AI models)
  4. `Games` (Independent gaming titles and interactive packages)
  5. `Developer Utilities` (CLI tools, formatters, API testers)
  6. `Developer Libraries` (SDKs, modules, Python/JS packages)
  7. `Web Tools` (SaaS utilities and browser applications)
  8. `Design Assets` (Vector packs, luxury UI kits, `.zip` bundles)
  9. `Others` (Miscellaneous utilities and tools)
* **Word-Level Full-Text Search:** Tokenizes query terms and searches across product titles, descriptions, categories, versions, and tag arrays in real-time.
* **Pagination & Memory Management:** Strict 10-item-per-page pagination with smooth category-bar scroll-to-view navigation.
* **Product Detail Modal:** Features release notes, version histories, developer profile flairs, platform fees, direct download triggers, and responsive multi-slide screenshot carousels.
* **Interactive Walkthroughs & Video Demoroom:** Embedded YouTube interactive walkthrough players with fallback messaging when no video demo is uploaded.

### 3.2 Cryptographic Integrity & Anti-Tampering Engine
* **SHA-256 Checksum Calculation:** Every product release automatically computes an authentic 64-character SHA-256 hash using Node.js `crypto` via [`backend/services/securityScanService.js`](file:///c:/Users/jiten/OneDrive/Desktop/MY%20FOLDERS/PROJECTS/My%20site/backend/services/securityScanService.js).
* **VirusTotal Multi-Engine Inspection:** Generates direct verification links (`https://www.virustotal.com/gui/search/<sha256>`) proving software is clean across 70+ antivirus engines.
* **In-Modal Security Verification Badge:** Users can inspect scan status and copy the cryptographic hash with a single click to verify installers locally via PowerShell `Get-FileHash` or terminal `sha256sum`.

### 3.3 Upper VIP Club & Monetization Engine
Upper Store features a dual-tier VIP membership model engineered for sustainability and monetization:

| Feature / Perk | Free Tier | Pro VIP (₹29 / $5 mo) | Elite VIP (₹299 / $45 yr) |
| :--- | :---: | :---: | :---: |
| **Download Access** | Standard Speeds | Priority CDN Mirroring | Dedicated VIP Bandwidth |
| **Prestige Badge** | None | Verified Golden Crown | Radiant Amethyst Diamond |
| **Custom @username** | ❌ Locked | ✅ Allowed (2x / year) | ✅ Allowed (2x / year) |
| **Developer Studio** | ❌ Locked | ✅ Up to 3 Products | ✅ **Unlimited** Products |
| **Broadcast Alerts** | Standard Alerts | Developer Broadcasts | Priority Push + Audio Chimes |
| **Platform Sales Fee**| N/A | Standard 10% | **0% Fees Waived** |
| **Direct Developer Support**| Community FAQ | Standard Support | 1-on-1 Engineering Support |

* **Real UPI QR Payment Engine:** Supports direct bank UPI transfers (`9692093386@naviaxis`) with dynamic QR code generation.
* **12-Digit UTR Bank Reference Validation:** Validates authentic 12-digit numeric Unique Transaction Reference (UTR) numbers. Rejects duplicate submissions to prevent double-spending.
* **Admin Verification Console:** Administrators inspect pending payments in [`AdminDashboard.jsx`](file:///c:/Users/jiten/OneDrive/Desktop/MY%20FOLDERS/PROJECTS/My%20site/frontend/src/pages/AdminDashboard.jsx) and approve/reject with one click, automatically upgrading the user's membership and sending an instant notification.
* **Self-Service Subscription Cancellation:** Users can cancel anytime via [`CancelSubscriptionModal.jsx`](file:///c:/Users/jiten/OneDrive/Desktop/MY%20FOLDERS/PROJECTS/My%20site/frontend/src/components/CancelSubscriptionModal.jsx), retaining active benefits until the billing period concludes.

### 3.4 VIP Custom Handle System (`@username`)
* **Strict Handle Rules:** Only lowercase letters (`a-z`), numbers (`0-9`), underscores (`_`), and dots (`.`). Length must be 3–30 characters. Uppercase characters, spaces, and symbols are rejected.
* **Flexible Input:** Users can input handles with or without a leading `@` (e.g., `@alex_dev` or `alex_dev`); the system automatically parses and normalizes it.
* **Annual Rate Limiting (Twice a Year):** VIP members are permitted to update their handle **up to 2 times within any rolling 365-day period**.
* **Live Quota Tracking & Debounced Availability:** Real-time query to `GET /api/auth/username/check/:username` confirms handle availability before submission.
* **Exclusivity Enforcement:** Non-VIP members viewing the handle editor receive a prompt to join the VIP Club.

### 3.5 VIP Developer Studio & Publisher Workspace
* **Aadhaar Identity Verification (KYC):** VIP developers link their government identity (Aadhaar photo via Google Drive) before publishing products to ensure zero malware or spam.
* **Product Publishing & Catalog Management:** Add/edit products with versioning, descriptions, changelogs, tags, external download URLs, and screenshot links.
* **Publishing Quota Enforcement:** Pro VIP members are bounded by a strict 3-product limit; Elite VIP members enjoy unlimited publishing.
* **Mobile-Responsive Architecture:** Includes horizontal touch-scrolling tabs, dynamic `100dvh` viewport support, and full-width touch actions.

### 3.6 Publisher Broadcast Notification Engine
* **Four Broadcast Channels:** `Update` (Blue), `Release` (Green), `Notice` (Yellow), and `Announcement` (Purple).
* **Audio Chimes & Sound Effects:** Emits custom Web Audio frequency chimes upon new broadcast reception with a global mute toggle.
* **Read-State Persistence:** Unread counts display in real-time in the Navbar bell icon with one-click "Mark All as Read" caching.

### 3.7 User Download & License Vault
* **Download Tracking:** Tracks authenticated and guest downloads via `download_history` with atomic counter increments.
* **Offline Software License Engine:** Generates unique cryptographic license keys (`UPPER-XXXX-XXXX-XXXX`) for premium items, allowing offline software activation.
* **Personal License Vault:** Users view, copy, and export their purchased product licenses at any time from [`UserLicensesModal.jsx`](file:///c:/Users/jiten/OneDrive/Desktop/MY%20FOLDERS/PROJECTS/My%20site/frontend/src/components/UserLicensesModal.jsx).

### 3.8 Unified Admin Command Portal
* **Inventory Control:** Complete CRUD over all platform software products across 9 categories.
* **User & Moderation Management:** Search registered users, view subscription plans, and execute one-click account bans or unbans with mandatory ban appeal linkage.
* **Payment Approval Console:** Inspect submitted UTR numbers, view user details, verify bank statements, and trigger automated account upgrades.
* **Broadcast Dispatcher:** Dispatch store-wide broadcast announcements directly to all user notification trays.
* **Telemetry & Health Diagnostics:** Inspect live memory consumption, CPU uptime, cache hit ratios, and API latency.

---

## 4. Security, Performance & Sustainability Hardening

### 4.1 Role-Based Access Control (RBAC)
* `protect`: Verifies valid JWT Bearer tokens for authenticated users.
* `protectAdmin`: Decodes JWT tokens and verifies `decoded.role === 'admin'`. Non-admin accounts receive immediate `403 Forbidden` responses.
* `protectPublisher`: Enforces verified VIP developer membership before allowing access to publishing routes.

### 4.2 Anti-Stampede Single-Flight Micro-Cache (`cacheService.js`)
* **Thundering Herd Shield:** When cache expires under heavy traffic, `cacheService.getOrSet` coalesces concurrent queries onto a single promise. 100 simultaneous requests result in **1 database read** while 99 are served from memory.
* **Event-Driven Cache Invalidation:** The catalog cache is evicted automatically when products are added, edited, deleted, or downloaded.

### 4.3 Atomic Counter Increments
* Replaced database-wide scans with atomic Firestore operations:
  ```javascript
  await pRef.update({ downloadCount: FieldValue.increment(1) });
  ```
  Saves millions of Firestore document reads each month.

### 4.4 Sliding-Window Rate Limiters (`express-rate-limit`)
* `apiLimiter`: 300 requests / 15 min per IP across `/api`.
* `authLimiter`: 15 attempts / 15 min per IP on login and register to block credential-stuffing attacks.
* `contactLimiter`: 10 submissions / 15 min per IP on contact forms to protect SMTP quotas.
* `downloadLimiter`: 30 records / 15 min per IP to prevent artificial metric inflation.

### 4.5 Memory Protection & Payload Limits
* Body parsers capped at a strict `2mb` (`express.json({ limit: '2mb' })`), preventing heap exhaustion attacks.
* Large files stream directly to disk or cloud storage via Multer without buffering in V8 heap memory.

### 4.6 Strict CORS Origin Whitelist
* Validates production domains (`https://jitendra-io.github.io`, `https://upperstore.pages.dev`).
* Validates wildcard development environments (`localhost`, `127.0.0.1`).
* Dynamic regex support for Cloudflare Pages subdomains (`^https:\/\/([a-zA-Z0-9_.-]+)\.pages\.dev$`) and Vercel (`^https:\/\/([a-zA-Z0-9_.-]+)\.vercel\.app$`).

---

## 5. Firestore Database Schema & Data Models

### 5.1 Collection: `users`
```json
{
  "_id": "user_doc_id",
  "uid": "firebase_or_custom_uid",
  "email": "user@example.com",
  "username": "alex_dev",
  "displayName": "Alex Developer",
  "photoURL": "https://unavatar.io/alex_dev",
  "password": "$2a$10$hashed_password...",
  "provider": "email | google",
  "isBanned": false,
  "bannedAt": null,
  "lastAppealedAt": null,
  "membership": {
    "plan": "pro | elite | free",
    "badge": "crown | diamond | null",
    "validUntil": "2027-01-01T00:00:00.000Z",
    "isCancelled": false
  },
  "usernameChangeHistory": [
    {
      "changedAt": "2026-11-01T14:00:00.000Z",
      "oldUsername": "alex",
      "newUsername": "alex_dev"
    }
  ],
  "subscriptionCount": 1,
  "totalVipDays": 30,
  "totalAmountSpent": 29,
  "lastSubscribedAt": "2026-11-01T12:00:00.000Z",
  "createdAt": "2026-10-30T10:00:00.000Z",
  "updatedAt": "2026-11-01T14:00:00.000Z"
}
```

### 5.2 Collection: `admins`
```json
{
  "_id": "admin_doc_id",
  "username": "Upper-Admin",
  "password": "$2a$10$hashed_password...",
  "role": "admin",
  "createdAt": "2026-10-30T10:00:00.000Z"
}
```

### 5.3 Collection: `products`
```json
{
  "_id": "product_doc_id",
  "title": "Upper Studio Pro",
  "category": "Windows App | Mobile App | AI Tool | Game | Developer Library | Web Tool | Software Tool | Design Asset | Others",
  "price": "Free | ₹99 | $15",
  "version": "1.0.0",
  "description": "High-speed developer asset processor and binary compressor.",
  "releaseNotes": "Initial release with full GPU acceleration.",
  "apkFile": "https://github.com/jitendra-io/Upper-Store/releases/download/v1.0.0/app.exe",
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "videoPoster": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
  "logo": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
  "images": [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b"
  ],
  "tags": ["windows", "desktop", "dev", "sha256-verified"],
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "virusTotalUrl": "https://www.virustotal.com/gui/search/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "scanStatus": "Clean (0/72 Antivirus Engines)",
  "hasLicenseKey": true,
  "licensePrice": "₹99",
  "isPlatformFeeWaived": false,
  "downloadCount": 1420,
  "rating": 4.9,
  "reviewCount": 38,
  "developerId": "user_doc_id",
  "developerName": "Upper Studio",
  "developerAvatar": "https://unavatar.io/alex_dev",
  "developerTier": "elite",
  "createdAt": "2026-10-31T10:00:00.000Z",
  "updatedAt": "2026-11-01T10:00:00.000Z"
}
```

### 5.4 Collection: `developers`
```json
{
  "_id": "dev_doc_id",
  "userId": "user_doc_id",
  "legalName": "Jitendra Mishra",
  "displayName": "Upper Studio",
  "username": "alex_dev",
  "phone": "9876543210",
  "aadhaarNumber": "123456789012",
  "aadhaarDriveLink": "https://drive.google.com/file/d/xxxxx/view",
  "isVerified": true,
  "isSuspended": false,
  "suspensionReason": null,
  "productCount": 1,
  "vipPlan": "elite",
  "avatar": "https://unavatar.io/alex_dev",
  "createdAt": "2026-10-31T11:00:00.000Z",
  "updatedAt": "2026-11-01T11:00:00.000Z"
}
```

### 5.5 Collection: `payments`
```json
{
  "_id": "payment_doc_id",
  "userEmail": "user@example.com",
  "userId": "user_doc_id",
  "plan": "pro | elite",
  "amount": 29,
  "currency": "INR",
  "utrNumber": "123456789012",
  "payerName": "Alex Kumar",
  "upiId": "9692093386@naviaxis",
  "status": "pending | verified | rejected",
  "verifiedBy": "Upper-Admin",
  "verifiedAt": "2026-11-01T13:00:00.000Z",
  "rejectionReason": null,
  "createdAt": "2026-11-01T12:30:00.000Z"
}
```

### 5.6 Collection: `notifications`
```json
{
  "_id": "notification_doc_id",
  "title": "v2.1.0 Released: Major Security Upgrade",
  "message": "We have enhanced cryptographic verification and added new categories.",
  "category": "Update | Release | Notice | Announcement",
  "link": "/products",
  "authorName": "Upper Official",
  "authorAvatar": "https://api.dicebear.com/7.x/initials/svg?seed=Upper",
  "targetEmail": null,
  "createdAt": "2026-11-01T14:00:00.000Z"
}
```

### 5.7 Collection: `reviews`
```json
{
  "_id": "review_doc_id",
  "productId": "product_doc_id",
  "userId": "user_doc_id",
  "userEmail": "user@example.com",
  "userName": "Alex",
  "userAvatar": "https://unavatar.io/alex",
  "rating": 5,
  "comment": "Exceptionally fast tool. SHA-256 matched perfectly.",
  "createdAt": "2026-11-01T15:00:00.000Z"
}
```

### 5.8 Collection: `licenses`
```json
{
  "_id": "license_doc_id",
  "licenseKey": "UPPER-98AF-48D2-BA93",
  "productId": "product_doc_id",
  "productTitle": "Upper Studio Pro",
  "userEmail": "user@example.com",
  "userId": "user_doc_id",
  "status": "active | revoked",
  "activatedAt": null,
  "createdAt": "2026-11-01T16:00:00.000Z"
}
```

---

## 6. Complete REST API Endpoint Reference

### 6.1 Authentication & Profile Routes (`/api/auth`)
| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public (Rate Limited) | Admin credentials login, returns JWT token |
| `POST` | `/api/auth/setup` | Permanent 403 Lock | Bootstrap admin (permanently locked if admin exists) |
| `POST` | `/api/auth/user/register` | Public (Rate Limited) | Register new user with email, password, and @username |
| `POST` | `/api/auth/user/login` | Public (Rate Limited) | User login with email and password, returns JWT token |
| `POST` | `/api/auth/user/google` | Public (Rate Limited) | Google OAuth account sync & automated handle generation |
| `GET` | `/api/auth/user/status/:email`| Private (`protect`) | Real-time banned status, membership, & VIP days check |
| `GET` | `/api/auth/username/check/:username` | Public | Live availability check for desired handle |
| `GET` | `/api/auth/user/username/status` | Private (`protect`) | Live check of annual change quota & remaining edits |
| `PUT` | `/api/auth/user/username` | Private (`protect`) | VIP handle update (enforces 2 changes/year rule) |
| `GET` | `/api/auth/users` | Admin (`protectAdmin`) | Fetch all registered users with subscription metrics |
| `POST` | `/api/auth/users/:userId/ban` | Admin (`protectAdmin`) | Ban a user account from download access |
| `POST` | `/api/auth/users/:userId/unban`| Admin (`protectAdmin`) | Restore access to a previously banned account |

### 6.2 Products Catalog Routes (`/api/products`)
| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public (Cached) | Fetch all products with in-memory caching (60s TTL) |
| `GET` | `/api/products/:id` | Public | Fetch single product by ID with VirusTotal inspection |
| `POST` | `/api/products` | Admin / Dev | Add new product with SHA-256 hash & VirusTotal link |
| `PUT` | `/api/products/:id` | Admin / Dev | Update product metadata, screenshots, or changelog |
| `DELETE`| `/api/products/:id` | Admin / Dev | Permanently delete product from catalog |

### 6.3 Downloads & Tracking Routes (`/api/downloads`)
| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/downloads/record` | Public (Rate Limited) | Record download and increment atomic counter |
| `GET` | `/api/downloads/history/:userEmail` | Private (`protect`) | Fetch user download history (IDOR protected) |
| `DELETE`| `/api/downloads/history/:userEmail` | Private (`protect`) | Clear user download history (IDOR protected) |
| `GET` | `/api/downloads/admin/all` | Admin (`protectAdmin`) | Fetch global download telemetry and log events |

### 6.4 Reviews & Ratings Routes (`/api/reviews`)
| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reviews/product/:productId` | Public | Fetch all reviews and compute aggregate star rating |
| `POST` | `/api/reviews/product/:productId` | Private (`protect`) | Submit authenticated review (author spoofing blocked) |
| `DELETE`| `/api/reviews/:reviewId` | Private (`protect`) | Delete review (author ownership or admin verified) |

### 6.5 VIP Payments & Subscriptions (`/api/payments`)
| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/payments/config` | Public | Retrieve active UPI ID and payment instructions |
| `POST` | `/api/payments/submit-utr` | Private (`protect`) | Submit 12-digit UTR reference for manual verification |
| `GET` | `/api/payments/my-status` | Private (`protect`) | Check status of user's pending or verified payments |
| `POST` | `/api/payments/cancel-subscription`| Private (`protect`) | Cancel active subscription; retain perks until expiry |
| `GET` | `/api/payments/admin/all` | Admin (`protectAdmin`) | Retrieve all submitted UTR payment records |
| `POST` | `/api/payments/admin/verify` | Admin (`protectAdmin`) | 1-click approve/reject UTR payment and upgrade user |

### 6.6 Developer Studio Routes (`/api/developer`)
| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/developer/profile` | Private (`protect`) | Fetch developer profile, KYC status, and releases |
| `POST` | `/api/developer/kyc` | Private (`protect`) | Submit Aadhaar KYC verification form |
| `GET` | `/api/developer/products` | Private (`protect`) | Retrieve developer's published releases |
| `POST` | `/api/developer/broadcast` | Private (`protect`) | Dispatch broadcast announcement to platform users |

### 6.7 Notifications & Telemetry (`/api/notifications`, `/api/health`)
| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Public | Fetch recent broadcast notifications |
| `POST` | `/api/notifications` | Admin (`protectAdmin`) | Create store-wide notification with channel styling |
| `DELETE`| `/api/notifications/:id` | Admin (`protectAdmin`) | Remove broadcast notification |
| `GET` | `/api/health` | Public | Real-time CPU uptime, heap memory usage, & cache metrics |

---

## 7. Directory Structure & Codebase Map

```
Upper-Store/
├── backend/
│   ├── config/
│   │   ├── firebase.js          # Firebase Admin SDK initialization & Firestore instance
│   │   └── jwtConfig.js         # JWT secret configuration
│   ├── controllers/
│   │   ├── authController.js    # Auth, @username validation, annual 2x limit, KYC
│   │   ├── contactController.js # Contact inquiries and ban appeals with SMTP mailer
│   │   ├── developerController.js # Developer Studio, KYC validation, publishing quotas
│   │   ├── downloadController.js# Atomic download counter & user history vault
│   │   ├── notificationController.js # Broadcast engine (Update, Release, Notice)
│   │   ├── paymentController.js # UPI QR payments, 12-digit UTR verification
│   │   ├── productController.js # Catalog CRUD, 9 categories, cache invalidation
│   │   ├── reviewController.js  # Product star reviews, anti-spoofing ownership
│   │   └── settingsController.js# Platform configuration & feature toggles
│   ├── middleware/
│   │   ├── authMiddleware.js    # protect, protectAdmin, protectPublisher RBAC
│   │   └── rateLimiter.js       # Sliding-window IP rate limiters
│   ├── routes/
│   │   ├── authRoutes.js        # Auth, @username routes, admin moderation
│   │   ├── contactRoutes.js     # Contact and ban appeal routes
│   │   ├── developerRoutes.js   # Developer Studio publishing routes
│   │   ├── downloadRoutes.js    # Download recording & history routes
│   │   ├── notificationRoutes.js# Notification routes
│   │   ├── paymentRoutes.js     # Payment submission and admin verification
│   │   ├── productRoutes.js     # Product catalog routes
│   │   └── reviewRoutes.js      # Review submission and rating routes
│   ├── services/
│   │   ├── cacheService.js      # Anti-stampede single-flight coalescing cache
│   │   ├── emailService.js      # Nodemailer SMTP transport service
│   │   ├── githubReleaseService.js # GitHub Releases API integration
│   │   ├── licenseService.js    # Cryptographic offline license key generator
│   │   └── securityScanService.js # SHA-256 checksum & VirusTotal verification
│   ├── seed-admin.js            # Initial admin bootstrap script
│   ├── server.js                # Express app initialization, CORS, middleware, keep-alive
│   └── package.json             # Backend dependencies & run scripts
│
├── frontend/
│   ├── public/                  # Static assets and favicons
│   ├── src/
│   │   ├── assets/              # Logos, UPI QR codes, VIP badge previews
│   │   ├── components/
│   │   │   ├── AuthModal.jsx / .css          # Login/Register modal with live handle check
│   │   │   ├── CancelSubscriptionModal.jsx   # Self-service VIP cancellation modal
│   │   │   ├── DeveloperStudioModal.jsx/.css # VIP Developer Studio with swipeable tabs
│   │   │   ├── DownloadHistoryModal.jsx/.css # Personal download history modal
│   │   │   ├── Navbar.jsx / .css             # Glassmorphic Navbar with audio chimes & profile
│   │   │   ├── ProductDetailModal.jsx / .css # Product details, video demoroom, SHA-256
│   │   │   ├── ProductReviewsModal.jsx / .css# Star rating and feedback modal
│   │   │   ├── UserLicensesModal.jsx / .css  # License key vault modal
│   │   │   ├── VipAvatar.jsx / .css          # Dynamic avatar with crown/diamond flairs
│   │   │   ├── VipClubModal.jsx / .css       # VIP Club plans, UPI QR, and UTR input
│   │   │   └── VipUsernameModal.jsx / .css   # VIP handle editor (2 changes/year limit)
│   │   ├── config/
│   │   │   └── firebase.js                   # Client-side Firebase App initialization
│   │   ├── context/
│   │   │   └── AuthContext.jsx               # Auth state, token persistence, status polling
│   │   ├── pages/
│   │   │   ├── About.jsx / .css              # Responsive platform about page
│   │   │   ├── AdminDashboard.jsx / .css     # Master admin control dashboard
│   │   │   ├── AdminLogin.jsx / .css         # Admin login screen
│   │   │   ├── Contact.jsx / .css            # Contact inquiry & ban appeal portal
│   │   │   ├── Home.jsx / .css               # Hero landing page, feature highlights
│   │   │   ├── Policies.jsx / .css           # Statutory UCC AS-IS terms & GDPR policies
│   │   │   ├── Products.jsx / .css           # Catalog grid, 9 category filters, search
│   │   │   └── VipClub.jsx / .css            # Dedicated VIP membership landing page
│   │   ├── utils/
│   │   │   ├── downloadTracker.js            # Download event tracker & localStorage sync
│   │   │   └── vipValidator.js               # Centralized VIP membership validator
│   │   ├── App.jsx / .css                    # Root application component & routes
│   │   ├── BackgroundAnimation.jsx / .css    # HTML5 Canvas magnetic particle system
│   │   └── main.jsx                          # React 19 entry point
│   ├── index.html                            # HTML5 root with Outfit typography
│   ├── vite.config.js                        # Vite bundler configuration
│   └── package.json                          # Frontend dependencies & build scripts
│
├── PROGRESS.md                  # Development progress tracker
├── UPDATE.md                    # Strategic audit and vulnerability report
└── README.md                    # Master comprehensive documentation
```

---

## 8. Installation & Local Development Setup Guide

### 8.1 Prerequisites
* **Node.js:** v18.0.0 or higher (v20+ recommended)
* **npm:** v9.0.0 or higher
* **Firebase Account:** A Firebase project with Firestore enabled in Native mode.
* **Git:** Installed on local machine.

### 8.2 Step 1: Clone Repository
```bash
git clone https://github.com/jitendra-io/Upper-Store.git
cd Upper-Store
```

### 8.3 Step 2: Configure Backend Environment
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   npm install
   ```
2. Create your `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Populate `.env` with your credentials:
   ```ini
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   JWT_SECRET=your_super_secret_jwt_key_here

   # Firebase Service Account Credentials
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your_firebase_client_id

   # Optional ImageKit (for image hosting)
   IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

   # Optional SMTP (for email notifications)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_gmail_app_password
   EMAIL_FROM=your_email@gmail.com
   ```
4. Seed the initial Administrator account:
   ```bash
   node seed-admin.js
   ```
5. Start the backend server:
   ```bash
   npm start
   # Backend starts on http://localhost:5000
   ```

### 8.4 Step 3: Configure Frontend Environment
1. In a new terminal window, navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Create `frontend/.env`:
   ```ini
   VITE_API_URL=http://localhost:5000

   # Firebase Web App Config (Found in Firebase Project Settings)
   VITE_FIREBASE_API_KEY=your_firebase_web_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
3. Start Vite development server:
   ```bash
   npm run dev
   # Frontend starts on http://localhost:5173
   ```

---

## 9. Production Deployment Guide

### 9.1 Frontend Deployment: Cloudflare Pages (Recommended)
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **Create Application** &rarr; **Pages** &rarr; **Connect to Git**.
3. Select the repository: `jitendra-io/Upper-Store`.
4. Configure Build Settings:
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. Configure Environment Variables:
   * `VITE_API_URL`: `https://upper-store.onrender.com` (your backend URL)
   * Add all `VITE_FIREBASE_*` variables from your local `.env`.
6. Click **Save and Deploy**. Cloudflare provisions global edge distribution and an automatic Google Trust Services SSL certificate at `https://upperstore.pages.dev/`.
7. **Continuous Deployment:** Every push to the `main` branch automatically triggers an edge build and zero-downtime deployment.

### 9.2 Backend Deployment: Render (Web Service)
1. Log in to [Render](https://dashboard.render.com/) and click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository `jitendra-io/Upper-Store`.
3. Configure Build Settings:
   * **Root Directory:** `backend`
   * **Environment:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
4. Add all environment variables from `backend/.env` (including `FIREBASE_PRIVATE_KEY` and `JWT_SECRET`).
5. Set `FRONTEND_URL`: `https://upperstore.pages.dev`.
6. Click **Deploy Web Service**.

---

## 10. Legal, Compliance & Statutory Framework

Operating an independent software distribution platform requires strict adherence to international copyright, consumer protection, and privacy laws.

### 10.1 Statutory AS-IS Warranty Disclaimer (UCC Standard)
In accordance with Section 2-316 of the Uniform Commercial Code (UCC), all software applications and digital assets distributed on Upper Store are provided:
```
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SOFTWARE, SERVICES, AND ASSETS 
ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, 
WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO IMPLIED 
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. 
UPPER STORE DOES NOT WARRANT THAT THE SOFTWARE WILL BE ERROR-FREE, SECURE, OR FREE FROM 
VIRUSES OR OTHER HARMFUL COMPONENTS.
```

### 10.2 Monetary Liability Cap
In no event shall Upper Store's aggregate liability under any legal claim exceed the amount actually paid by the user in the preceding twelve (12) months, or fifty United States Dollars ($50.00 USD), whichever is less.

### 10.3 DMCA Safe Harbor & Copyright Takedown Procedure
Upper Store complies with Title 17, United States Code, Section 512 (DMCA). Copyright owners may submit formal takedown notices to our designated agent:
* **Designated Agent Email:** `upper.official.in@gmail.com`
* **Required Notice Details:** Identification of the copyrighted work, URL of infringing material, statement of good faith belief, and physical or electronic signature under penalty of perjury.
* **Counter-Notification:** Affected developers have the statutory right to file a counter-notice in compliance with 17 U.S.C. § 512(g)(3).

### 10.4 Privacy & Data Protection (GDPR & DPDP Act Compliance)
* **Self-Service Erasure:** Users can request account and data erasure via the Contact/Appeal form or profile management.
* **Minimal Data Collection:** Passwords use salted bcrypt hashes; payment verification processes reference UTRs without storing credit card or CVV details.
* **Transparent Storage:** Delineates strictly necessary cookies (JWT auth tokens) from functional preferences (audio settings, theme).

---

## 11. License & Acknowledgments

* **Platform License:** Released under the [MIT License](LICENSE).
* **Distributed Software Assets:** Individual software products, tools, and mobile applications distributed through Upper Store remain the exclusive intellectual property of their respective creators and developers under their designated software licenses.
* **Engineering Lead:** Jitendra Mishra ([@jitendra-io](https://github.com/jitendra-io))

---
*Built with speed, cryptographic security, and elegance.*


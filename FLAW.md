# Audit of Follower and Following System: Cross-Device Synchronization and Architectural Flaws

## 1. Executive Summary

This document provides a technical root cause analysis of the follower/following system in Upper Store, specifically explaining why an account displays "Following" on a PC browser while displaying "Follow" (not following) on a mobile device under the exact same authenticated user account.

The investigation identified ten critical flaws spanning frontend React state lifecycle management, token hydration timing, Firestore document key design, database query indexing, multi-alias handling, and mobile browser security sandboxing.

---

## 2. Core Root Cause: Cross-Device Desynchronization (PC "Following" vs Phone "Follow")

The primary reason a user sees "Following" on PC but "Follow" on mobile with the same account is a combination of two flaws:

### Primary Cause: Asynchronous Token Hydration Race Condition in `DeveloperProfile.jsx`
- Location: `frontend/src/pages/DeveloperProfile.jsx` (Lines 249-299)
- In `AuthContext.jsx`, `token` and `user` state are initialized as `null` on initial JavaScript evaluation. On page mount, `useEffect` asynchronously reads `localStorage.getItem('upper_user_token')` and calls `setToken(savedToken)`.
- In `DeveloperProfile.jsx`, the public profile fetch hook is configured as:
  ```javascript
  useEffect(() => {
    const fetchDeveloper = async () => {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('upper_user_token') : null);
      const res = await fetch(`${API_BASE}/api/developers/profile/${cleanUsername}`, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      // ...
    };
    if (cleanUsername) {
      fetchDeveloper();
    }
  }, [cleanUsername]);
  ```
- Flaw: The dependency array is strictly `[cleanUsername]`. It does NOT include `token`, `user`, or `isLoggedIn`.
- On mobile devices (particularly WebKit on iOS Safari and Chrome Mobile), the execution order of `useEffect` hooks during initial render frequently runs `DeveloperProfile`'s effect before `AuthContext` has populated `token`.
- If `localStorage` is briefly unavailable during initial cold startup, or if the user logged in after opening the profile, `activeToken` evaluates to `null`.
- The request reaches `GET /api/developers/profile/:username` without an `Authorization` header. The backend treats the request as an anonymous public visitor, returning `developer.isFollowing: false`.
- Because `[cleanUsername]` never changes once loaded, the effect never re-executes when `token` is subsequently set in `AuthContext`. The UI remains frozen displaying the "Follow" button.

### Secondary Cause: Mutable URL Parameter Document Keying
- Location: `backend/controllers/developerController.js` (Lines 917, 1337)
- Follow records in Firestore collection `developer_follows` are keyed by:
  `${followerId}_${cleanUsername}`
  where `cleanUsername` is derived directly from `req.params.username.toLowerCase()`.
- If a user on PC navigated to a developer via one handle representation (such as an email handle prefix, alias, or route slug like `upper-store`), the record was written as `${followerId}_upper-store`.
- If the user on mobile navigated via a product link or search result linking to `upperstore` or canonical `w4simg`, the backend checks `${followerId}_upperstore` or `${followerId}_w4simg`.
- Because the Firestore document key does not match, the query returns `exists: false`, leading the mobile client to show "Follow".

---

## 3. Comprehensive Breakdown of All Identified Flaws

### Flaw 1: Missing Auth Dependencies in Profile Fetch Hook
- File: `frontend/src/pages/DeveloperProfile.jsx`
- Severity: High
- Impact: Unauthenticated initial profile renders remain stuck in unauthenticated state even after authentication state is confirmed.
- Description: `DeveloperProfile.jsx` uses `useEffect(..., [cleanUsername])`. If the user opens the profile in an unauthenticated or pending state and then signs in using the inline authentication modal, the modal updates `user` and `token` in `AuthContext`, but `fetchDeveloper` is never re-triggered. The user must manually perform a hard reload to see "Following".

### Flaw 2: Firestore Document Key Fragility (`${followerId}_${cleanUsername}`)
- File: `backend/controllers/developerController.js` (Lines 917, 1337, 1471, 1803)
- Severity: Critical
- Impact: Follow state breaks across URL variants, handle aliases, and username updates.
- Description: Document IDs in `developer_follows` use the raw route slug parameter `cleanUsername` instead of the immutable target user ID (`developerUserId` / `targetUserId`). Because usernames can change and official profiles have multiple aliases (`upperstore`, `upperofficial`, `upper-store`), storing documents under mutable route slugs causes document ID mismatches between follow creation, status checks, and profile reads.

### Flaw 3: Upper Store Official Profile Multi-Alias Inconsistency
- Files: `backend/controllers/developerController.js`, `frontend/src/components/ProductDetailModal.jsx`
- Severity: High
- Impact: Following Upper Store Official from one page does not reflect on other pages.
- Description: Upper Store Official is referenced by multiple identifiers across the codebase:
  - `upperstore`
  - `upperofficial`
  - `upper-store`
  - `upper_store`
  In Firestore:
  - Developer document `jYmj42AV379CO3Az1FP4` has `username: "upperofficial"`.
  - Existing follow documents are stored as `${followerId}_upperstore`.
  - In `getDeveloperProfile` (line 646), it checks:
    ```javascript
    const followDoc1 = await db.collection('developer_follows').doc(`${reqUid}_upperstore`).get();
    const followDoc2 = await db.collection('developer_follows').doc(`${reqUid}_upperofficial`).get();
    ```
  - In `removeDeveloperFollower` (line 1863), it updates:
    ```javascript
    const devSnap = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
    ```
    When `cleanUsername` is `upperstore`, `devSnap` is empty because the developer document's stored username is `upperofficial`. As a result, the official profile document in `developers` has `followersCount: undefined`.

### Flaw 4: Silent Auth Degradation on Expired JWT Tokens
- Files: `backend/controllers/developerController.js`, `backend/controllers/authController.js`
- Severity: High
- Impact: Logged-in appearance in Navbar while backend treats all requests as guest.
- Description: JWT tokens expire after 7 days (`expiresIn: '7d'`). On mobile devices where browsers are rarely closed, a user may keep a tab open for more than 7 days.
  - In `AuthContext.jsx`, `user` data remains stored in `localStorage` indefinitely because `refreshUserStatus` swallows network/auth errors without calling `logout()`.
  - The Navbar displays the user's avatar and name, leading the user to believe they are authenticated.
  - When `DeveloperProfile` calls `GET /api/developers/profile/:username`, the backend executes:
    ```javascript
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (decoded && decoded.uid) { ... }
    } catch (_) {}
    ```
  - `jwt.verify` throws `TokenExpiredError`, which is silently swallowed in the catch block.
  - The backend returns `isFollowing: false`.

### Flaw 5: Global In-Memory Cache Staleness in `DeveloperFollowModal.jsx`
- File: `frontend/src/components/DeveloperFollowModal.jsx` (Lines 10-14, 78-87, 116-120)
- Severity: Medium
- Impact: Stale followers/following list served from client memory.
- Description: `followListsCache` is declared as a module-scoped singleton object outside the React component tree:
  ```javascript
  const followListsCache = {
    followers: {},
    following: {},
  };
  ```
  - Once populated, this cache never expires and has no TTL or timestamp.
  - When a user follows or unfollows a creator, `followListsCache` for other users or on other tabs/views is not cleared.
  - If a user opens the modal on mobile after previously viewing it, the stale cached list is displayed immediately.

### Flaw 6: VIP Username Mutation Orphanage
- Files: `backend/controllers/authController.js` (Lines 1001-1110, 1249-1395), `backend/controllers/developerController.js`
- Severity: High
- Impact: Changing username breaks all follow connections for that creator.
- Description: Active VIP Club members (Pro and Elite) are permitted to update their username handle up to two times per year.
  - When `updateUsername` runs, it updates the `username` field in `users`, `developers`, `products`, and `notifications`.
  - It does NOT update or migrate records in `developer_follows`.
  - Any follow document created under `${followerId}_${oldUsername}` remains keyed to the old username.
  - Following count and follower count calculations querying `developerUsername == newUsername` drop to zero, and all existing followers appear as "Follow" instead of "Following".

### Flaw 7: Underutilized Follow-Status Endpoint (`getFollowStatus`)
- Files: `backend/routes/developerRoutes.js`, `frontend/src/pages/DeveloperProfile.jsx`
- Severity: Medium
- Impact: Unnecessary full profile reload required to synchronize follow state.
- Description: The backend provides a dedicated endpoint:
  `GET /api/developers/follow-status/:username`
  However, `DeveloperProfile.jsx` never calls this endpoint. It relies exclusively on the heavy profile endpoint (`/api/developers/profile/:username`).
  A lightweight verification call upon window focus or after auth hydration would immediately reconcile the follow state without re-fetching products, reviews, and statistics.

### Flaw 8: Inconsistent Follower Counter Persistence Across Collections
- File: `backend/controllers/developerController.js` (Lines 1428-1433, 1862-1869)
- Severity: Medium
- Impact: Inconsistent follower counts between profile page, developer cards, and database records.
- Description:
  - In `toggleFollowDeveloper` and `removeDeveloperFollower`, after computing `followersCount`, the code runs:
    ```javascript
    const devSnap = await db.collection('developers').where('username', '==', cleanUsername).limit(1).get();
    if (!devSnap.empty) {
      devSnap.docs[0].ref.update({ followersCount });
    }
    ```
  - If a user is followed who has not yet submitted developer KYC (i.e. they only exist in the `users` collection), `devSnap` is empty. The `followersCount` is never persisted to the `users` document.
  - Subsequent queries that rely on `user.followersCount` show 0, while aggregation queries show the real number.

### Flaw 9: Mobile Storage Partitioning, ITP, and Multi-Account Mismatches
- Files: Client-side storage and session handling
- Severity: Medium
- Impact: Session isolation causing different authenticated identities between PC and mobile.
- Description:
  - On iOS (WebKit / Safari), Intelligent Tracking Prevention (ITP) and Private Browsing partition or purge `localStorage` after 7 days of inactivity.
  - Mobile browsers frequently have Google One-Tap or native autofill configured with a personal Google account, while desktop browsers may be signed into a developer or work Google account.
  - Firestore records show multiple accounts created under similar names (e.g., `yorjitendra.io@gmail.com`, `mishra96920@gmail.com`, `kumar.jkm.io@gmail.com`, `098skwasimboss@gmail.com`, `w4sim.dev@gmail.com`).
  - If a user signs into `yorjitendra.io` on PC and follows an account, but on mobile signs in via Google One-Tap with `mishra96920`, the follower UID is completely different (`XYzie1o7rcZskXpm2nDl` vs `KnV8040pB7C403nBOnEH`). The mobile device is legitimately not following the account.

### Flaw 10: Inverted Follow Action Under State Desync
- File: `frontend/src/pages/DeveloperProfile.jsx` (Lines 132-167)
- Severity: High
- Impact: Tapping "Follow" on mobile unintentionally triggers an "Unfollow" action on the server.
- Description:
  - If the user is already following on the server, but the mobile UI shows "Follow" due to the hydration bug:
  - The user taps the button expecting to follow.
  - The frontend optimistic state flips to "Following" and sends `POST /api/developers/follow/:username`.
  - The backend inspects `followDoc.exists`. Because the user was ALREADY following on the server, the backend toggles the state off (`delete()`), returning `{ isFollowing: false }`.
  - The user is now unfollowed on both PC and mobile.

---

## 4. Remediation Plan

### Step 1: Fix `DeveloperProfile.jsx` Auth Lifecycle & Status Revalidation
1. In `DeveloperProfile.jsx`, update the profile fetch `useEffect` to watch `token` and `user?.uid`:
   ```javascript
   useEffect(() => {
     if (cleanUsername) {
       fetchDeveloper();
     }
   }, [cleanUsername, token, user?.uid]);
   ```
2. Add a lightweight window focus and visibility change listener to re-verify follow status:
   ```javascript
   useEffect(() => {
     if (!token || !cleanUsername) return;
     const checkStatus = async () => {
       try {
         const res = await fetch(`${API_BASE}/api/developers/follow-status/${cleanUsername}`, {
           headers: { Authorization: `Bearer ${token}` },
         });
         if (res.ok) {
           const data = await res.json();
           if (typeof data.isFollowing === 'boolean') {
             setIsFollowing(data.isFollowing);
           }
           if (typeof data.followersCount === 'number') {
             setFollowersCount(data.followersCount);
           }
         }
       } catch (_) {}
     };
     window.addEventListener('focus', checkStatus);
     document.addEventListener('visibilitychange', () => {
       if (document.visibilityState === 'visible') checkStatus();
     });
     return () => {
       window.removeEventListener('focus', checkStatus);
     };
   }, [cleanUsername, token]);
   ```

### Step 2: Canonicalize Document Keys in Firestore (`${followerId}_${targetUserId}`)
1. In `backend/controllers/developerController.js`, identify the canonical `targetUserId` before generating the follow document reference.
2. Store documents under the immutable composite key:
   `${followerId}_${targetUserId}`
   (while maintaining a fallback read on `${followerId}_${cleanUsername}` for backward compatibility with existing records).
3. Canonicalize official store targets to resolve strictly to `targetUserId = 'GOhjkTTW9ZPqPS9I7Oa1'` across all routes (`upperstore`, `upperofficial`, `upper-store`, `upper_store`).

### Step 3: Handle Token Expiration Gracefully in `AuthContext.jsx`
1. When `refreshUserStatus` receives a 401 or token validation error, clear the expired token from `localStorage` and reset `token` and `user` state to `null`.
2. This prevents the UI from displaying a false logged-in status when the session has expired on the backend.

### Step 4: Invalidate Cache on Follow State Changes
1. Clear `followListsCache` entries for the target developer whenever a follow or unfollow action is performed.
2. In `DeveloperFollowModal.jsx`, ensure that when a follower is removed or unfollowed, the local cache is either purged or surgically updated.

### Step 5: Migrate Follow Records on VIP Username Changes
1. In `authController.js` (`updateUsername`), add a batch update to update `developerUsername` and `followerUsername` across `developer_follows` records when a creator changes their username handle.

---

## 5. Verification Checklist

- [ ] Check cross-device synchronization: Log in on PC and Mobile with identical email/UID, follow on PC, refresh mobile profile, confirm button shows "Following".
- [ ] Check login on profile page: Open developer profile while logged out, log in via modal, verify button switches to "Following" without page reload.
- [ ] Check official store profile: Follow `/developer/upperstore`, visit `/developer/upperofficial`, verify follow status is consistent.
- [ ] Check token expiration: Verify expired token triggers graceful re-authentication rather than silent guest fallback.
- [ ] Check follow toggle idempotence: Verify clicking Follow when already following does not invert unintentionally if frontend state was stale.


---

# Part II: Frontend Architecture and Codebase Audit (Bugs, Lifecycle Errors, and Performance Flaws)

This section provides an audit of the entire React frontend (`frontend/src`), cataloging identified bugs, React hook anti-patterns, memory leaks, unhandled promise rejections, parsing edge cases, and mobile browser rendering issues.

---

## 1. Summary of Frontend Findings

| ID | Component / File | Severity | Flaw Category | Description |
| --- | --- | --- | --- | --- |
| **F-01** | `Navbar.jsx` (Lines 124-126) | **Critical** | Rules of Hooks Violation | Early conditional return placed before 14 hooks causes React invariant violation when navigating to/from `/admin`. |
| **F-02** | `MarkdownViewer.jsx` (Line 139) | **High** | Syntax Parsing Bug | Table divider regex strictly matches `\|---`, failing on standard Markdown tables with spaces (`\| --- \|`). |
| **F-03** | `Navbar.jsx` (Lines 310-315) | **High** | Resource Exhaustion | Unconditional 8-second polling interval runs continuously for unauthenticated visitors and backgrounded mobile tabs. |
| **F-04** | `DeveloperStudioModal.jsx` (Line 160) | **High** | Runtime Crash Risk | Unchecked `allProds.filter()` throws `TypeError` if `/api/products` returns a non-array error object. |
| **F-05** | `ProductDetailModal.jsx` (Line 54) & `AdminDashboard.jsx` (Line 28) | **High** | Browser Sandboxing Crash | Direct `localStorage.getItem` in `useState` initializers throws `SecurityError` in iOS Safari Private Mode. |
| **F-06** | `AdminDashboard.jsx` (Lines 158-185) | **Medium** | Lifecycle TDZ Warning | `useEffect` executes `const` helper functions before their lexical declaration, causing temporal dead zone warnings. |
| **F-07** | `ProductReviewsModal.jsx` (Line 94) & `DownloadHistoryModal.jsx` (Line 35) | **Medium** | Unhandled Promise Rejection | `fetchUserDownloadHistoryFromDB().then()` lacks a `.catch()` block, throwing uncaught errors on network failure. |
| **F-08** | `Policies.jsx` (Line 289) & `About.jsx` (Line 14) | **Medium** | Memory Leak / Uncaught Exception | Uncaught `navigator.clipboard` promise rejections and uncleaned `setTimeout` timers on page transitions. |
| **F-09** | `ProductDetail.jsx` (Lines 16-26) | **Medium** | UX Navigation Gap | Invalid product IDs (`/products/:id`) silently display the products catalog with no 404 or "Product Not Found" feedback. |
| **F-10** | Modal Overlays (`DeveloperStudioModal.css`, `GlobalSearchModal.css`) | **Low** | Mobile Viewport Shifting | Use of `100vh` instead of `100dvh` causes vertical layout jump when mobile virtual keyboard opens. |

---

## 2. Detailed Technical Breakdown of Frontend Flaws

### Flaw F-01: Critical React Rules of Hooks Invariant Violation
- **File**: `frontend/src/components/Navbar.jsx` (Lines 124-126)
- **Severity**: Critical
- **Category**: React Lifecycle
- **Root Cause**: An early return statement is placed midway through the component function:
  ```javascript
  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  ```
  Immediately following this statement, 14 React hooks are declared:
  - `useEffect` (menu scroll lock, line 134)
  - `useEffect` (URL search sync, line 152)
  - `useEffect` (mobile scroll lock, line 166)
  - `useEffect` (click outside dropdown, line 237)
  - `useState` for `isBanned`, `notifications`, `notifDropdownOpen`, `readNotifIds`, `flashToast` (lines 252-264)
  - `useRef` for `notifDropdownRef`, `initialFetchRef` (lines 262, 265)
  - `useEffect` (notification polling interval, line 310)
  - `useEffect` (click outside notification dropdown, line 325)
  - `useEffect` (ban status check, line 335)
- **Impact**: When navigating to `/admin`, the component returns early after executing only the first 3 hooks. When navigating to `/products` or `/`, React encounters 14 additional hooks. This causes a hook order mismatch between renders, leading to React compiler failure, state corruption, or runtime crashes (`Rendered fewer hooks than expected`).
- **Remediation**:
  Move `if (location.pathname.startsWith('/admin')) return null;` to the very end of the component function, immediately before the JSX return statement. All hooks must execute on every render pass.

---

### Flaw F-02: Broken Markdown Table Parsing with Spaced Delimiters
- **File**: `frontend/src/components/MarkdownViewer.jsx` (Line 139)
- **Severity**: High
- **Category**: Content Rendering
- **Root Cause**: Table parsing relies on the following condition to identify table headers and dividers:
  ```javascript
  if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1]?.includes('|---')) {
  ```
- **Impact**: Standard GitHub-flavored Markdown tables generated by documentation tools or written by developers frequently use spaced delimiters:
  ```markdown
  | Version | Changes |
  | --- | --- |
  | 1.0.3 | Bug fixes |
  ```
  Because `| --- |` contains spaces, `lines[i + 1]?.includes('|---')` evaluates to `false`. The entire table is bypassed and rendered as raw, unformatted text lines.
- **Remediation**:
  Update the table divider detection regex to match standard divider formats (with or without spaces and alignment colons):
  ```javascript
  const nextLineTrimmed = (lines[i + 1] || '').trim();
  const isTableDivider = /^\|?(\s*:?-+:?\s*\|?)+$/.test(nextLineTrimmed) && nextLineTrimmed.includes('-');
  if (trimmed.startsWith('|') && trimmed.endsWith('|') && isTableDivider) {
  ```

---

### Flaw F-03: Unconditional 8-Second Notification Polling Battery/Network Waste
- **File**: `frontend/src/components/Navbar.jsx` (Lines 310-315)
- **Severity**: High
- **Category**: Performance and Network
- **Root Cause**:
  ```javascript
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);
  ```
- **Impact**:
  1. Unauthenticated visitors (public traffic browsing products or policies) fire HTTP requests to `/api/notifications` every 8 seconds continuously.
  2. The interval continues firing even when the browser tab is minimized, backgrounded, or phone screen is locked, preventing mobile devices from entering deep sleep.
  3. When an authenticated user logs in or out, the effect does not re-evaluate because its dependency array is empty (`[]`).
- **Remediation**:
  1. Only poll if an active token or logged-in user exists (`if (!token && !user) return;`).
  2. Pause polling when `document.visibilityState === 'hidden'`.
  3. Add `token` to the dependency array so polling begins upon login and stops on logout.

---

### Flaw F-04: Unchecked Array Assumption on `allProds.filter()` in Developer Studio
- **File**: `frontend/src/components/DeveloperStudioModal.jsx` (Lines 156-165)
- **Severity**: High
- **Category**: Runtime Stability
- **Root Cause**:
  ```javascript
  const prodRes = await fetch(`${API_BASE}/api/products`);
  if (prodRes.ok) {
    const allProds = await prodRes.json();
    const owned = allProds.filter(
      (p) => (p.developerId && p.developerId === userId) || ...
    );
  ```
- **Impact**: If the products API endpoint returns an error object (e.g. `{ success: false, message: 'Server busy' }`), `allProds` is an object rather than an array. Calling `allProds.filter()` throws an unhandled `TypeError: allProds.filter is not a function`, crashing the Developer Studio modal.
- **Remediation**:
  Ensure defensive array casting:
  ```javascript
  const allProds = await prodRes.json();
  const safeList = Array.isArray(allProds) ? allProds : [];
  const owned = safeList.filter(...);
  ```

---

### Flaw F-05: Unsafe Synchronous `localStorage` Initializers in React State
- **Files**: `frontend/src/components/ProductDetailModal.jsx` (Line 54) and `frontend/src/pages/AdminDashboard.jsx` (Line 28)
- **Severity**: High
- **Category**: Cross-Browser Compatibility
- **Root Cause**:
  In `ProductDetailModal.jsx`:
  ```javascript
  const [feePaid, setFeePaid] = useState(() => localStorage.getItem(`upper_paid_fee_${product?.id}`) === 'true');
  ```
  In `AdminDashboard.jsx`:
  ```javascript
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  ```
- **Impact**: In iOS Safari Private Browsing mode, WebKit webviews with blocked cookies, or strict sandboxed iframes, invoking `localStorage.getItem` directly in synchronous component initialization throws a `SecurityError` or `DOMException`. This results in an unhandled exception before the first frame renders, producing a blank screen for the user.
- **Remediation**:
  Wrap all `localStorage` state initializers in `try...catch` blocks:
  ```javascript
  const [feePaid, setFeePaid] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(`upper_paid_fee_${product?.id}`) === 'true';
    } catch {
      return false;
    }
  });
  ```

---

### Flaw F-06: Unhoisted Function Declarations inside `AdminDashboard.jsx` Lifecycle
- **File**: `frontend/src/pages/AdminDashboard.jsx` (Lines 158-185)
- **Severity**: Medium
- **Category**: Code Quality / Linter Compliance
- **Root Cause**:
  `useEffect` invokes `fetchUpiPayments(savedToken)`, `fetchUsers(savedToken)`, `fetchDevelopers(savedToken)`, etc. at lines 164-174. However, these functions are declared as lexical `const` arrow functions at line 177 and beyond.
- **Impact**: Calling `const` variables before their declaration violates the Temporal Dead Zone (TDZ) rules in JavaScript. While modern V8 engines may tolerate this if the effect executes asynchronously after full script evaluation, it violates ESLint strict immutability checks (`react(immutability): Cannot access variable while it is being initialized`) and will throw in strict compilation environments.
- **Remediation**:
  Declare data-fetching helpers using hoisted `async function` declarations or place their definitions above the `useEffect` hook.

---

### Flaw F-07: Unhandled Promise Rejections in Download History Synchronization
- **Files**: `frontend/src/components/ProductReviewsModal.jsx` (Line 94) and `frontend/src/components/DownloadHistoryModal.jsx` (Line 35)
- **Severity**: Medium
- **Category**: Error Handling
- **Root Cause**:
  ```javascript
  fetchUserDownloadHistoryFromDB(user.email).then((dbHistory) => {
    if (dbHistory) setHistory(dbHistory);
  });
  ```
- **Impact**: If the backend database endpoint fails, times out, or returns a 502 Bad Gateway, the returned promise rejects without a `.catch()` handler, emitting an `UnhandledPromiseRejection` error in the browser console.
- **Remediation**:
  Append `.catch((err) => console.warn('Download history sync failed:', err))` to all promise chains.

---

### Flaw F-08: Uncaught Clipboard API Exceptions and Uncleaned Navigation Timers
- **Files**: `frontend/src/pages/Policies.jsx` (Line 289) and `frontend/src/pages/About.jsx` (Line 14)
- **Severity**: Medium
- **Category**: Memory Leaks & Exception Handling
- **Root Cause**:
  In `Policies.jsx`:
  ```javascript
  navigator.clipboard.writeText(text);
  setCopiedSection(idx);
  setTimeout(() => setCopiedSection(null), 2000);
  ```
  In `About.jsx`:
  ```javascript
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);
  ```
- **Impact**:
  1. `navigator.clipboard.writeText()` is asynchronous and returns a Promise. If the user has denied clipboard permissions or the site is served in an insecure context, the promise rejects uncaught.
  2. `setTimeout` timers are created without storing their IDs and without returning cleanup functions from `useEffect`. If the user navigates away before the timeout expires, the callback executes on an unmounted component.
- **Remediation**:
  1. Use `navigator.clipboard?.writeText(text)?.catch(() => {})`.
  2. Store timer references and clear them in the effect cleanup function:
     ```javascript
     const timer = setTimeout(...);
     return () => clearTimeout(timer);
     ```

---

### Flaw F-09: Silent Product Not Found Fallback in `ProductDetail.jsx`
- **File**: `frontend/src/pages/ProductDetail.jsx` (Lines 16-26)
- **Severity**: Medium
- **Category**: User Experience
- **Root Cause**:
  When a user opens `/products/:id` with a non-existent or deleted product ID:
  ```javascript
  const res = await fetch(`${API_BASE}/api/products/${id}`);
  if (res.ok) {
    const data = await res.json();
    setProduct(data);
  } else {
    setProduct(null);
  }
  ```
- **Impact**: When `product` evaluates to `null`, `ProductDetailModal` does not render. The component silently displays the background `<Products />` page with no alert, error banner, or redirect to `/404`, leaving the user confused about whether the page loaded correctly.
- **Remediation**:
  If the product fetch fails with a 404 status, redirect to `/404` or render a clean "Product Not Found" modal dialog.

---

### Flaw F-10: Mobile Dynamic Viewport Height (DVH) Shifting on Virtual Keyboard
- **Files**: `DeveloperStudioModal.css`, `GlobalSearchModal.css`, `AuthModal.css`
- **Severity**: Low
- **Category**: Responsive Design
- **Root Cause**:
  Modal overlays use `height: 100vh` or `max-height: 90vh`.
- **Impact**: On modern mobile browsers (Safari on iOS 16+, Chrome on Android), opening the virtual keyboard shifts the viewport height unpredictably because `100vh` does not account for the keyboard overlay, causing buttons and form inputs to be pushed off-screen or clipped.
- **Remediation**:
  Adopt dynamic viewport units with standard fallback:
  ```css
  height: 100vh;
  height: 100dvh;
  max-height: 90vh;
  max-height: 90dvh;
  ```

---

## 3. Frontend Remediation Roadmap

1. **Phase 1 (Immediate - High Stability Impact)**:
   - Fix `Navbar.jsx`: Relocate `if (location.pathname.startsWith('/admin')) return null;` to the end of the component.
   - Fix `MarkdownViewer.jsx`: Support spaced table divider syntax (`| --- | --- |`).
   - Fix `DeveloperStudioModal.jsx`: Guard `allProds.filter()` with `Array.isArray()`.
   - Fix `ProductDetailModal.jsx`: Wrap `localStorage.getItem` in `try...catch`.
2. **Phase 2 (Performance & Mobile Optimization)**:
   - Fix `Navbar.jsx`: Gate notification polling behind token presence and document visibility.
   - Fix `Policies.jsx` & `About.jsx`: Add clipboard error handling and timer cleanups.
3. **Phase 3 (UX Polish)**:
   - Fix `ProductDetail.jsx`: Add 404 routing for non-existent product IDs.
   - Adopt `dvh` units across modal CSS stylesheets.

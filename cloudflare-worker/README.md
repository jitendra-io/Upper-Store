# Upper Store - Cloudflare Edge Download Delivery Worker

This Cloudflare Worker provides **100% free, unlimited-speed edge delivery** for all software, APKs, and AI models hosted on GitHub Releases, while keeping GitHub completely hidden and taking zero bandwidth from your Node.js server.

---

### Step 1: Create a Free Cloudflare Account (1 Minute)
1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and create a free account (no credit card required).
2. On the left sidebar, click **Compute (Workers & Pages)** -> **Overview**.
3. Click the blue **Create application** button, then select **Create Worker**.
4. Give your worker a name (e.g. `upperstore-downloader`), and click **Deploy**.

---

### Step 2: Paste the Worker Code
1. On your newly created worker's page, click **Edit code** (or **Quick Edit**).
2. Delete whatever template code is inside, and paste the entire code from [`worker.js`](file:///c:/Users/jiten/OneDrive/Desktop/MY%20FOLDERS/PROJECTS/My%20site/cloudflare-worker/worker.js).
3. Click **Deploy** in the top right corner.

---

### Step 3: Add Your Secret Key (1 Minute)
1. Go back to your Worker's settings by clicking the worker name.
2. Click the **Settings** tab -> **Variables and Secrets**.
3. Under **Secrets**, click **Add**.
   - **Variable name**: `DOWNLOAD_SECRET_KEY`
   - **Value**: Any long random password (e.g. `upper_store_secret_2026_xyz`).
4. Click **Deploy**.

---

### Step 4: Add to Your Upper Store Backend `.env`
Open your `backend/.env` file and add these two lines:

```env
CLOUDFLARE_WORKER_URL=https://upperstore-downloader.<your-subdomain>.workers.dev
DOWNLOAD_SECRET_KEY=upper_store_secret_2026_xyz
```
*(Replace `<your-subdomain>` with the actual URL shown on your Cloudflare Worker page, and make sure `DOWNLOAD_SECRET_KEY` matches the secret you entered in Step 3).*

---

### Optional: Bind Your Custom Domain (e.g. `download.upperstore.io`)
If you have a custom domain on Cloudflare:
1. In your Worker dashboard, click **Settings** -> **Domains & Routes**.
2. Click **Add** -> **Custom Domain**.
3. Enter `download.yourdomain.com` and click **Add Custom Domain**.
4. Update `CLOUDFLARE_WORKER_URL=https://download.yourdomain.com` in `backend/.env`.

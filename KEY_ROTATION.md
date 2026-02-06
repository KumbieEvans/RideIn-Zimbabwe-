# 🔑 Key Rotation Guide — RideIn Zimbabwe

## ⚠️ IMPORTANT

API keys were previously committed to this repository's git history. Even though the `.env` file has been removed, the keys remain in the git history. **All keys must be rotated immediately.**

## Step-by-Step Rotation

### 1. Google Gemini API Key (`API_KEY`)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Navigate to **API Keys** in the left sidebar
3. Find the compromised key and click **Delete**
4. Click **Create API Key** to generate a new one
5. Copy the new key
6. Update in Netlify: **Site Settings → Environment Variables → `API_KEY`**

### 2. Mapbox Token (`MAPBOX_TOKEN`)

1. Go to [Mapbox Account](https://account.mapbox.com/)
2. Navigate to **Tokens**
3. Find the compromised token
4. Click **Create a token** (or rotate the existing one)
5. Configure URL restrictions (only allow your Netlify domain)
6. Copy the new token
7. Update in Netlify: **Site Settings → Environment Variables → `MAPBOX_TOKEN`**

### 3. Ably API Key (`ABLY_API_KEY`)

1. Go to [Ably Dashboard](https://ably.com/accounts)
2. Select your app
3. Navigate to **API Keys**
4. **Revoke** the compromised key
5. **Create** a new API key with the same capabilities
6. Copy the new key
7. Update in Netlify: **Site Settings → Environment Variables → `ABLY_API_KEY`**

### 4. Xano API URLs

The Xano base URLs are workspace-specific and may not need rotation unless the workspace itself is compromised. However, if concerned:

1. Go to your [Xano Workspace](https://xano.com/)
2. Navigate to each API group
3. Regenerate the API group if supported
4. Update all four URLs in Netlify environment variables

## After Rotation

1. Trigger a new deploy on Netlify to pick up the new keys
2. Test all functionality:
   - Login/Signup (Xano Auth)
   - Trip creation (Xano Trips)
   - Map display (Mapbox)
   - Real-time updates (Ably)
   - AI features (Gemini)
3. Verify the old keys no longer work

## Preventing Future Exposure

- The `.gitignore` now blocks all `.env` files
- Use `frontend/.env.example` as a template
- Only set real keys in Netlify's environment variable UI
- Netlify secret scanning is now re-enabled

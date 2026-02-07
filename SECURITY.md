# Security Policy — RideIn Zimbabwe

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email the maintainer directly or use GitHub's private vulnerability reporting

## Environment Variables

All API keys and secrets are managed through environment variables.

### Local Development
```bash
cd frontend
cp .env.example .env
# Fill in your development API keys
```

### Production (Netlify)
Set environment variables in:
**Netlify Dashboard → Site Settings → Build & Deploy → Environment Variables**

Required variables:
| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `API_KEY` | Google Gemini API Key | [AI Studio](https://aistudio.google.com/) |
| `MAPBOX_TOKEN` | Mapbox Public Token | [Mapbox](https://www.mapbox.com/) |
| `ABLY_API_KEY` | Ably Realtime Key | [Ably](https://ably.com/) |
| `XANO_AUTH_BASE_URL` | Xano Auth API | Your Xano workspace |
| `XANO_TRIPS_BASE_URL` | Xano Trips API | Your Xano workspace |
| `XANO_RIDER_BASE_URL` | Xano Rider API | Your Xano workspace |
| `XANO_DRIVER_BASE_URL` | Xano Driver API | Your Xano workspace |

### Key Rotation

If keys were ever committed to version control (including in git history), they should be rotated:

1. **Google Gemini**: Revoke at [AI Studio](https://aistudio.google.com/) → API Keys → Delete → Create New
2. **Mapbox**: Rotate at [Mapbox Account](https://account.mapbox.com/) → Tokens → Create/Rotate
3. **Ably**: Rotate at [Ably Dashboard](https://ably.com/) → App → API Keys → Revoke → Create New
4. **Xano**: Contact Xano support or regenerate workspace API groups

After rotating, update the keys in your Netlify environment variables.

## Security Best Practices

- **Never** commit `.env` files to version control
- **Always** use environment variables for secrets
- Use Netlify Functions as a proxy for server-side API keys (Xano, Ably, Gemini)
- The Mapbox token is the only key that can be public (it's a client-side token restricted by URL)
- Keep `ABLY_API_KEY` and `API_KEY` server-side only (in Netlify Functions)

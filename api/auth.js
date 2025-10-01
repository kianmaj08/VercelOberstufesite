/**
 * OAuth entry for Decap/Netlify CMS on Vercel.
 * Redirects the user to GitHub's OAuth consent screen.
 * Environment variables required:
 *  - GITHUB_CLIENT_ID
 *  - GITHUB_CLIENT_SECRET (only used in callback)
 *  - OAUTH_REDIRECT (optional, defaults to current domain + /api/callback)
 */
export default async function handler(req, res) {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).send("GITHUB_CLIENT_ID fehlt als Environment Variable.");
    }
    const url = new URL(req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] + '://' + req.headers['x-forwarded-host'] : `https://${req.headers.host}`);
    const redirectUri = process.env.OAUTH_REDIRECT || `${url.origin}/api/callback`;
    const state = Math.random().toString(36).slice(2);
    const scope = "repo,user";
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);
    // Store state in cookie (short TTL) for basic CSRF protection.
    res.setHeader("Set-Cookie", `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`);
    res.writeHead(302, { Location: authUrl.toString() });
    res.end();
  } catch (e) {
    res.status(500).send(e?.message || "Unbekannter Fehler");
  }
}
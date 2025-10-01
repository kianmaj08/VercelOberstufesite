/**
 * OAuth callback for Decap/Netlify CMS on Vercel.
 * Exchanges the GitHub code for an access token and returns a small HTML page
 * that forwards the token back to the CMS window (required by Decap/Netlify CMS).
 */
export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const state = req.query.state;
    const cookies = Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split("=").map(decodeURIComponent)).filter(p => p[0]));
    if (!code) {
      return res.status(400).send("Missing code");
    }
    // Optional: state validation
    if (cookies.oauth_state && state && cookies.oauth_state !== state) {
      return res.status(400).send("Invalid state");
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(500).send("GITHUB_CLIENT_ID/SECRET fehlen als Environment Variablen.");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });
    const tokenJson = await tokenRes.json();
    if (tokenJson.error) {
      return res.status(400).send("OAuth error: " + tokenJson.error_description || tokenJson.error);
    }
    const accessToken = tokenJson.access_token;

    // Decap/Netlify CMS expects the provider to postMessage this format:
    // authorization:github:success:<token>
    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Authentifizierung</title></head>
  <body>
    <script>
      (function() {
        function send() {
          var token = ${JSON.stringify(accessToken)};
          var msg = 'authorization:github:success:' + token;
          if (window.opener) {
            window.opener.postMessage(msg, '*');
            window.close();
          } else {
            document.body.innerText = 'Token: ' + token;
          }
        }
        send();
      })();
    </script>
  </body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send(e?.message || "Unbekannter Fehler");
  }
}
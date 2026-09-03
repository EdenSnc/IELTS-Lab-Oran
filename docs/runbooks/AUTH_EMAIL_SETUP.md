# Production authentication email setup

Supabase's built-in SMTP service is for development only. IELTS Lab Oran should use the native Supabase + Resend integration for authentication mail, while Supabase remains the authentication system.

## One-time external setup

1. In Resend, add and verify the dedicated sending subdomain `auth.ieltslab.org`.
2. Add the exact SPF and DKIM records Resend supplies to the DNS provider. Add a DMARC record for the parent domain if one is not already present.
3. In the Supabase organization integrations page, connect Resend to project `yncsiqqataiimwsjgpib`. This creates a scoped Resend key and fills Supabase's custom SMTP settings.
4. In Supabase **Authentication → Email / SMTP**, verify:
   - Sender name: `IELTS Lab Oran`
   - Sender address: `no-reply@auth.ieltslab.org`
   - Custom SMTP: enabled
   - Confirm email: enabled
   - Secure password changes: enabled
   - Minimum password length: `10`
   - Required characters: lowercase, uppercase and digits
   - Session timebox: `720 hours`
   - Inactivity timeout: `336 hours`
   - TOTP enrollment and verification: enabled
5. In **Authentication → Email Templates**, set:
   - Confirm signup subject: `Confirm your IELTS Lab Oran account`
   - Confirm signup body: `supabase/templates/confirmation.html`
   - Reset password subject: `Reset your IELTS Lab Oran password`
   - Reset password body: `supabase/templates/recovery.html`
   - Magic-link template: include the six-digit `{{ .Token }}` so provider-neutral trusted-device step-up can be completed without a password
6. Disable open and click tracking for authentication messages in Resend.
7. Send confirmation and recovery messages to a non-team test address and verify delivery, branding, redirects, and spam placement.

Do not add a Resend API key to `NEXT_PUBLIC_*`. The native integration keeps SMTP credentials outside the application and Vercel.

## Google and Facebook login

The sign-in and sign-up pages read Supabase's public provider settings. A social button is hidden until its provider is enabled successfully, so no Vercel feature flag or redeploy is required.

Before enabling either provider, add these Supabase redirect URLs under **Authentication → URL Configuration**:

- Production site URL: `https://www.ieltslab.org`
- Production redirect: `https://www.ieltslab.org/api/auth/callback`
- Local redirect: `http://localhost:3000/api/auth/callback`
- Local IP redirect: `http://127.0.0.1:3000/api/auth/callback`

Production authentication email must use the verified custom SMTP sender before public signup is enabled; Supabase's shared development mail service is not a production fallback.

Google:

1. Create a Google OAuth web client for IELTS Lab Oran.
2. Add `https://www.ieltslab.org` as an authorized JavaScript origin.
3. Add `https://yncsiqqataiimwsjgpib.supabase.co/auth/v1/callback` as the authorized redirect URI.
4. Configure the consent-screen brand, home page, privacy-policy URL and terms URL before publishing the app.
5. Paste the client ID and secret into **Supabase → Authentication → Providers → Google**, then enable it.

Facebook:

1. Create a Meta app with Facebook Login for the web.
2. Add `https://yncsiqqataiimwsjgpib.supabase.co/auth/v1/callback` as a valid OAuth redirect URI.
3. Configure the public app domain, privacy-policy URL and data-deletion instructions required by Meta.
4. Paste the app ID and secret into **Supabase → Authentication → Providers → Facebook**, then enable it and put the Meta app live.

Provider client secrets belong only in the provider consoles and Supabase. Do not add them to Vercel or `NEXT_PUBLIC_*`.

## Phone login decision

Phone OTP is deliberately disabled until an SMS provider and abuse controls are selected. Supabase phone login requires MessageBird, Twilio, Vonage or another supported delivery integration; messages incur provider charges. Before enabling it, configure CAPTCHA, conservative OTP rate limits, an Algerian sender strategy, delivery monitoring and a cost ceiling.

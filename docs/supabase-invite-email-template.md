# Supabase Auth — Invite user email template (Cleared Home Lending)

Apply this in the Supabase Dashboard:

**Authentication → Email Templates → Invite user**

Use the subject and body below. Supabase injects the magic link with `{{ .ConfirmationURL }}` (do not remove that placeholder).

---

## Subject

```
You're invited to Cleared Home Lending
```

## Body (HTML or plain text)

Use **Plain text** or minimal HTML. Example for **Plain text**:

```
Hi,

You've been invited to access your Cleared Home Lending partner dashboard.

Click below to create your login and access your account:

{{ .ConfirmationURL }}

After logging in, you can view your dashboard here:
https://homebuyer-clarity-engine.vercel.app/realtor

If you did not expect this invitation, you can ignore this email.

Cleared Home Lending
Clear Answers. Confident Moves.
```

### Production URL

Replace `https://homebuyer-clarity-engine.vercel.app/realtor` with your live app URL if it differs (e.g. custom domain). Loan officers use `/` (internal dashboard) after login; realtor partners use `/realtor`. You may add a second line for staff, e.g. `https://<your-domain>/`, if you invite both from the same template.

---

## Redirect URLs

Under **Authentication → URL configuration**, add your site URLs, including:

- Site URL / redirect URLs used by `inviteUserByEmail` (see app: `redirectTo` → `/login`)
- Password reset path if configured: `/reset-password`

---

## Related: welcome email after provisioning

Optional **welcome** emails (separate from this Supabase invite) are sent from the app server when `RESEND_API_KEY` and `RESEND_WELCOME_FROM` are set. See `lib/email/welcome-email.server.ts`.

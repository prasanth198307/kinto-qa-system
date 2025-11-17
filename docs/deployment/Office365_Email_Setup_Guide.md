# Office 365 Email Configuration Guide for KINTO Smart Ops

## Overview

This guide shows how to switch from SendGrid to **Office 365 SMTP** for sending email notifications (FREE with your existing Office 365 business account).

---

## Why Switch to Office 365?

✅ **FREE** - You already have Office 365 Business  
✅ **10,000 emails/day** sending limit  
✅ **Professional** - Emails come from your company domain  
✅ **Reliable** - Microsoft infrastructure  
✅ **No additional cost** - Use existing account  

---

## Prerequisites

1. Office 365 Business Account
2. Email address to send from (e.g., `notifications@yourcompany.com`)
3. Admin access to Microsoft 365 Admin Center

---

## Step 1: Enable SMTP Authentication in Office 365

### Option A: For Individual User

1. Go to **Microsoft 365 Admin Center**: https://admin.microsoft.com
2. Navigate to **Users** → **Active users**
3. Select the email account you want to use (e.g., `notifications@yourcompany.com`)
4. Click **Mail** tab
5. Select **Manage email apps**
6. **Check the box** for **"Authenticated SMTP"**
7. Click **Save changes**

⏰ **Note:** Changes can take up to 1 hour to propagate.

### Option B: For Entire Organization

1. Go to **Exchange Admin Center**: https://admin.exchange.microsoft.com
2. Navigate to **Settings** → **Mail flow**
3. Find **"Turn off SMTP AUTH protocol"**
4. **Uncheck** this option (to enable SMTP AUTH)
5. Click **Save**

---

## Step 2: Get App Password (If MFA is Enabled)

If your account has **Multi-Factor Authentication (MFA)** enabled:

1. Go to: https://account.microsoft.com/security
2. Sign in with your Office 365 account
3. Go to **Security** → **App passwords**
4. Click **Create a new app password**
5. Name it: "KINTO Email Notifications"
6. **Copy the generated password** (you'll need this)

⚠️ **Important:** If MFA is enabled, you MUST use the App Password, NOT your regular password.

---

## Step 3: Office 365 SMTP Settings

Use these settings for your Office 365 email:

| Setting | Value |
|---------|-------|
| **SMTP Server** | `smtp.office365.com` |
| **Port** | `587` |
| **Encryption** | TLS/STARTTLS |
| **Authentication** | Required |
| **Username** | Full email address (e.g., `notifications@yourcompany.com`) |
| **Password** | Your password OR App Password (if MFA enabled) |

---

## Step 4: Environment Variables (Your Mac System)

Add these to your `.env` file on your Mac:

```env
# Office 365 SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@yourcompany.com
SMTP_PASS=your-password-or-app-password
SENDER_EMAIL=notifications@yourcompany.com
SENDER_NAME=KINTO Operations

# Remove or comment out SendGrid
# SENDGRID_API_KEY=your-sendgrid-key
```

**Replace:**
- `notifications@yourcompany.com` → Your actual Office 365 email
- `your-password-or-app-password` → Your password (or App Password if MFA)

---

## Step 5: Update Code to Use Office 365

The code changes required are minimal. We'll use `nodemailer` instead of `@sendgrid/mail`.

### 5.1 Install nodemailer

On your Mac:
```bash
cd /Users/prasanthdusi/kinto-qa-system/kinto-qa-system
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 5.2 Update `server/notificationService.ts`

Replace the SendGrid email function (lines 258-280) with Office 365 SMTP:

```typescript
// Production mode with Office 365 SMTP
try {
  const nodemailer = await import('nodemailer');
  
  // Create Office 365 transporter
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // false for port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });

  const from = process.env.SENDER_EMAIL || config.senderEmail || 'noreply@kinto.com';
  const fromName = process.env.SENDER_NAME || config.senderName || 'KINTO QA System';

  await transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to: email,
    subject,
    html: htmlBody
  });

  console.log(`[EMAIL SENT] To: ${email}, Machine: ${machineName}`);
} catch (error) {
  console.error('[EMAIL ERROR]', error);
  throw error;
}
```

### 5.3 Update Condition Check

Change line 247 from:
```typescript
if (config.testMode === 1 || !process.env.SENDGRID_API_KEY) {
```

To:
```typescript
if (config.testMode === 1 || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
```

---

## Step 6: Rebuild and Test

On your Mac:

```bash
cd /Users/prasanthdusi/kinto-qa-system/kinto-qa-system

# Stop the app
pm2 stop kinto-backend

# Rebuild with new code
npm run build

# Restart
pm2 restart kinto-backend

# Watch logs
pm2 logs kinto-backend --lines 50
```

---

## Step 7: Test Email Sending

1. Go to **Notification Settings** in your KINTO app
2. Enable **Email Notifications**
3. Set **Sender Email** and **Sender Name**
4. Create a test Machine Startup Reminder
5. Check if email arrives

---

## Troubleshooting

### Error: "535 5.7.139 Authentication failed"

**Solution:** SMTP AUTH is not enabled in Office 365
- Follow Step 1 to enable it
- Wait 1 hour for changes to propagate

### Error: "Wrong credentials"

**Solution:**
- Use **full email address** as username (not just username)
- If MFA is enabled, use **App Password** instead of regular password
- Check for typos in `.env` file

### Error: "Connection timeout on port 587"

**Solution:**
- Check firewall settings
- Try port 25 (less secure, but sometimes works)
- Ensure your ISP doesn't block SMTP

### Emails not arriving

**Solution:**
- Check spam/junk folder
- Verify sender email is valid Office 365 address
- Check Office 365 admin center for any blocks
- Review pm2 logs: `pm2 logs kinto-backend`

---

## Comparison: SendGrid vs Office 365

| Feature | SendGrid | Office 365 |
|---------|----------|------------|
| **Cost** | $15-20/month (paid plan) | **FREE** (with existing account) |
| **Daily Limit** | 100/day (free), 40k-100k (paid) | 10,000/day |
| **Setup** | API key | Email + Password |
| **From Address** | Any (with verification) | Must be your Office 365 domain |
| **Reliability** | High | High |
| **Best For** | High volume, multiple domains | Company emails, professional look |

---

## Important Notes

### ⚠️ Microsoft is Retiring Basic Auth (2025-2026)

Microsoft is phasing out username/password authentication by **September 2025**. After this date, you'll need to migrate to **OAuth 2.0**.

**For Now (2025):**
- Use username/password (works fine)
- Use App Password if MFA enabled

**Future (After Sept 2025):**
- Need to implement OAuth 2.0
- More complex setup but more secure
- I can help you migrate when the time comes

### 📧 Sending Limits

- **10,000 recipients per day** per mailbox
- For bulk emails (newsletters, etc.), use dedicated email service
- For KINTO notifications (100-200/day), Office 365 is perfect

### 🔒 Security Best Practices

1. **Use a dedicated email** (e.g., `notifications@yourcompany.com`)
2. **Don't use personal account** for automated emails
3. **Use App Password** if MFA is enabled
4. **Store credentials in .env**, never in code
5. **Restrict .env file permissions**: `chmod 600 .env`

---

## Summary

**What You Get:**
✅ FREE email sending (no SendGrid cost)  
✅ Professional emails from your company domain  
✅ 10,000 emails/day (more than enough)  
✅ Same reliability as SendGrid  
✅ Better branding (emails from yourcompany.com)  

**What You Need:**
1. Enable SMTP AUTH in Office 365 Admin Center (5 minutes)
2. Get App Password if MFA enabled (2 minutes)
3. Update .env file with Office 365 credentials (1 minute)
4. Install nodemailer and update code (provided above)
5. Rebuild and restart app (2 minutes)

**Total Time:** ~15-20 minutes

---

**Need Help?** 

If you encounter any issues during setup, let me know the error message and I'll help you troubleshoot!

---

**Document Version:** 1.0  
**Last Updated:** November 15, 2025  
**Status:** Ready for Implementation

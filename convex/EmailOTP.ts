import { Email } from "@convex-dev/auth/providers/Email";

function sixDigitCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => String(byte % 10)).join("");
}

export const EmailOTP = Email({
  id: "email-otp",
  maxAge: 60 * 15,
  async generateVerificationToken() {
    return sixDigitCode();
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    const from =
      process.env.AUTH_EMAIL_FROM ?? "Expense Trackr <onboarding@resend.dev>";

    if (!apiKey) {
      if (process.env.AUTH_DEV_OTP_LOGGING === "1") {
        // Development fallback: the code is printed in the Convex logs.
        // Production must configure AUTH_RESEND_KEY.
        console.log(`[auth] OTP for ${email}: ${token}`);
        return;
      }
      throw new Error("AUTH_RESEND_KEY is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your Expense Trackr sign-in code",
        text: `Your Expense Trackr sign-in code is ${token}. It expires in 15 minutes.`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Could not send sign-in email: ${detail}`);
    }
  },
});

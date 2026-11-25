import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";

function sixDigitCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => String(byte % 10)).join("");
}

/**
 * Password reset delivery. No email provider is configured, so the code is
 * printed in the Convex dev terminal. Swap `sendVerificationRequest` for a
 * real email call when delivery is wired up.
 */
const PasswordReset = Email({
  id: "password-reset",
  maxAge: 60 * 15,
  async generateVerificationToken() {
    return sixDigitCode();
  },
  async sendVerificationRequest({ identifier: email, token }) {
    console.log(`[auth] Password reset code for ${email}: ${token}`);
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: PasswordReset,
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        const name =
          typeof params.name === "string" ? params.name.trim() : undefined;
        return { email, ...(name ? { name } : {}) };
      },
      validatePasswordRequirements(password) {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
      },
    }),
  ],
});

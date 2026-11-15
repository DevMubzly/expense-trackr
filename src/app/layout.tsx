import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "goey-toast/styles.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Expense Trackr",
  description: "A desktop expense tracker for UGX and USD.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

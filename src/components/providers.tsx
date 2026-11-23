"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { GooeyToaster } from "goey-toast";
import { TooltipProvider } from "@/components/motion/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import { CategoriesProvider } from "@/components/categories-provider";
import { ConvexProvider } from "@/components/convex-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { TransactionDialogProvider } from "@/components/expense-dialog";

function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <GooeyToaster
      position="top-left"
      theme={resolvedTheme === "light" ? "light" : "dark"}
      preset="smooth"
      duration={3600}
      closeButton
      showProgress
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <ConvexProvider>
        <AuthProvider>
          <TooltipProvider delay={140} closeDelay={60}>
            <CategoriesProvider>
              <CurrencyProvider>
                <TransactionDialogProvider>
                  {children}
                  <Toaster />
                </TransactionDialogProvider>
              </CurrencyProvider>
            </CategoriesProvider>
          </TooltipProvider>
        </AuthProvider>
      </ConvexProvider>
    </ThemeProvider>
  );
}

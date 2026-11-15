"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { GooeyToaster } from "goey-toast";
import { TooltipProvider } from "@/components/motion/tooltip";
import { ExpenseDialogProvider } from "@/components/expense-dialog";

function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <GooeyToaster
      position="bottom-right"
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delay={140} closeDelay={60}>
        <ExpenseDialogProvider>
          {children}
          <Toaster />
        </ExpenseDialogProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

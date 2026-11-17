"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { motion } from "motion/react";
import { Icon } from "@/components/huge-icon";
import { Loader } from "@/components/motion/loader";
import { Money } from "@/components/money";
import { Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { answerQuestion, type AssistantAnswer } from "@/lib/assistant";
import { formatNumber } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { useTransactionDialog } from "@/components/expense-dialog";
import type { Debt, Goal, Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; answer: AssistantAnswer };

const SUGGESTIONS = [
  "How much did I spend on transport this month?",
  "Can I afford 300k?",
  "Where am I wasting money?",
  "How much should I save before payday?",
  "How much do I owe?",
  "What is my net worth?",
];

export default function AssistantPage() {
  const { version } = useTransactionDialog();
  const { data: stats, loading } = useApi<Stats>(`/api/stats?period=30d&v=${version}`);
  const { data: goalsData } = useApi<Goal[]>(`/api/goals?v=${version}`);
  const { data: debtsData } = useApi<Debt[]>(`/api/debts?v=${version}`);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const goals = goalsData ?? [];
  const debts = debtsData ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader variant="dither" size={30} />
      </div>
    );
  }

  const borrowed = debts
    .filter((debt) => debt.direction === "borrowed")
    .reduce((total, debt) => total + debt.balanceUgx, 0);
  const lent = debts
    .filter((debt) => debt.direction === "lent")
    .reduce((total, debt) => total + debt.balanceUgx, 0);

  function ask(value = question) {
    const text = value.trim();
    if (!text) return;
    const answer = answerQuestion(text, { stats: stats ?? null, goals, debts });
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text },
      { id: Date.now() + 1, role: "assistant", answer },
    ]);
    setQuestion("");
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl leading-none md:text-[56px]">
            Ask your money anything.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A mock assistant that answers from your ledger. Spending, income, goals, debts,
            affordability, and how much is safe before payday.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
          <Icon icon={SparklesIcon} className="size-3.5" /> Mock intelligence
        </span>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <Panel className="col-span-12 flex min-h-[64vh] flex-col p-6 xl:col-span-8">
          <div className="flex-1 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon icon={SparklesIcon} className="size-5" />
                </span>
                <p className="mt-4 font-display text-2xl">Start with a money question.</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Try a suggested prompt on the right, or ask about a category, an
                  affordability check, a goal, or your debts.
                </p>
              </div>
            ) : (
              messages.map((message) =>
                message.role === "user" ? (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  >
                    {message.text}
                  </motion.div>
                ) : (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "max-w-[90%] rounded-2xl rounded-bl-sm border bg-muted/30 p-4",
                      message.answer.tone === "positive" && "border-emerald-500/30",
                      message.answer.tone === "warning" && "border-amber-500/40",
                    )}
                  >
                    <p className="text-[13px] font-semibold">{message.answer.title}</p>
                    <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {message.answer.lines.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  </motion.div>
                ),
              )
            )}
            <div ref={endRef} />
          </div>

          <div className="mt-6 flex items-center gap-2 border-t border-border/70 pt-4">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask();
                }
              }}
              placeholder="Ask about spending, goals, debts..."
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Ask the assistant"
            />
            <Button
              onClick={() => ask()}
              disabled={!question.trim()}
              size="icon"
              className="size-11 rounded-full"
              aria-label="Send question"
            >
              <Icon icon={ArrowUp02Icon} className="size-4" />
            </Button>
          </div>
        </Panel>

        <div className="col-span-12 space-y-5 xl:col-span-4">
          <Panel className="p-6">
            <PanelHeader title="Try asking" hint="Tap one to run it" className="p-0 pb-4" />
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="rounded-xl border border-border/70 px-3 py-2 text-left text-[12px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <PanelHeader title="Current picture" hint={stats?.monthLabel} className="p-0 pb-4" />
            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Spent</span>
                <Money value={stats?.totals.month ?? 0} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Income</span>
                <Money value={stats?.totals.income ?? 0} size="sm" />
              </div>
              <div className="flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-muted-foreground">Safe to spend / day</span>
                <Money value={stats?.forecast.safePerDayUgx ?? 0} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">You owe</span>
                <Money value={borrowed} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Owed to you</span>
                <Money value={lent} size="sm" />
              </div>
              <div className="flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-muted-foreground">Goals saved</span>
                <span className="tnum font-medium">
                  {formatNumber(goals.reduce((total, goal) => total + goal.savedUgx, 0))} UGX
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

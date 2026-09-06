"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Flame, Lock, Zap } from "lucide-react";
import Counter from "@/components/motion/Counter";
import Reveal from "@/components/motion/Reveal";
import SectionHeading from "@/components/sections/SectionHeading";
import type { ContributionData } from "@/types/portfolio";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKey(key: string) {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

interface Cell {
  date: string;
  count: number;
  note?: string;
  future: boolean;
}

interface Stats {
  total: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  best: number;
  bestDate: string;
  t1: number;
  t2: number;
  t3: number;
}

export default function Heatmap({
  contributions,
  username,
}: {
  contributions: ContributionData[];
  username?: string;
}) {
  const { weeks, stats, monthLabels } = useMemo(() => {
    const counts = new Map<string, { count: number; note?: string }>();
    for (const c of contributions) {
      counts.set(c.date, { count: c.count, note: c.note });
    }

    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end);
    start.setDate(end.getDate() - 363);
    start.setDate(start.getDate() - start.getDay()); // align grid to Sunday

    const weeksOut: Cell[][] = [];
    let total = 0;
    let activeDays = 0;
    let best = 0;
    let bestDate = "";
    const cursor = new Date(start);
    while (cursor <= end) {
      const week: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dateKey(cursor);
        const future = cursor > end;
        const entry = future ? undefined : counts.get(key);
        const count = entry?.count ?? 0;
        if (!future) {
          total += count;
          if (count > 0) activeDays++;
          if (count > best) {
            best = count;
            bestDate = key;
          }
        }
        week.push({ date: key, count, note: entry?.note, future });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeksOut.push(week);
    }

    // Streaks (computed over the full dataset)
    const active = Array.from(counts.entries())
      .filter(([, v]) => v.count > 0)
      .map(([k]) => k)
      .sort();

    let currentStreak = 0;
    {
      const d = new Date(end);
      if (!((counts.get(dateKey(d))?.count ?? 0) > 0)) d.setDate(d.getDate() - 1);
      while ((counts.get(dateKey(d))?.count ?? 0) > 0) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    }

    let longestStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const key of active) {
      if (prev) {
        const next = parseKey(prev);
        next.setDate(next.getDate() + 1);
        run = dateKey(next) === key ? run + 1 : 1;
      } else {
        run = 1;
      }
      longestStreak = Math.max(longestStreak, run);
      prev = key;
    }

    // Level thresholds from quartiles of active days
    const nonzero = Array.from(counts.values())
      .map((v) => v.count)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
    const q = (p: number) =>
      nonzero.length > 0 ? nonzero[Math.min(nonzero.length - 1, Math.floor(p * nonzero.length))] : 0;

    const labels = weeksOut.map((week, wi) => {
      const first = parseKey(week[0].date);
      const prevWeek = wi > 0 ? parseKey(weeksOut[wi - 1][0].date) : null;
      return !prevWeek || first.getMonth() !== prevWeek.getMonth()
        ? first.toLocaleString("en-US", { month: "short" })
        : null;
    });

    return {
      weeks: weeksOut,
      monthLabels: labels,
      stats: { total, activeDays, currentStreak, longestStreak, best, bestDate, t1: q(0.25), t2: q(0.5), t3: q(0.75) } as Stats,
    };
  }, [contributions]);

  const levelOf = (count: number) =>
    count === 0 ? 0 : count <= stats.t1 ? 1 : count <= stats.t2 ? 2 : count <= stats.t3 ? 3 : 4;

  if (contributions.length === 0) return null;

  const statCards = [
    { icon: Zap, value: stats.total, label: "contributions · last 12 mo" },
    { icon: CalendarDays, value: stats.activeDays, label: "active days" },
    { icon: Flame, value: stats.currentStreak, label: "current streak (days)" },
    { icon: Flame, value: stats.longestStreak, label: "longest streak (days)" },
  ];

  return (
    <section id="activity" className="relative py-24 sm:py-28" aria-label="GitHub activity">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="05 — activity"
          title="GitHub activity"
          description={
            username
              ? `A year of shipping code${username ? ` as @${username}` : ""} — including private commits the public graph hides.`
              : "A year of shipping code, including private commits."
          }
        />

        <Reveal delay={0.1} className="mt-12">
          <div className="rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur sm:p-7">
            {/* stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border/50 bg-background/40 p-4 transition-colors duration-300 hover:border-primary/35"
                >
                  <s.icon className="h-4 w-4 text-primary" aria-hidden />
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    <Counter value={s.value} />
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* grid */}
            <div className="mt-6 overflow-x-auto pb-1" data-lenis-prevent>
              <div className="min-w-max">
                {/* month labels — row has an explicit height so labels never overlap the grid */}
                <div className="mb-2 flex h-[15px] gap-[3px]">
                  <div className="w-[28px] shrink-0" aria-hidden />
                  {weeks.map((_, wi) => (
                    <div key={`m-${wi}`} className="relative w-[11px] shrink-0">
                      {monthLabels[wi] ? (
                        <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] leading-none text-muted-foreground">
                          {monthLabels[wi]}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex gap-[3px]">
                  {/* day labels */}
                  <div className="flex w-[28px] shrink-0 flex-col gap-[3px]" aria-hidden>
                    {DAY_LABELS.map((label, i) => (
                      <span
                        key={`d-${i}`}
                        className="flex h-[11px] items-center text-[9px] leading-none text-muted-foreground"
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  {weeks.map((week, wi) => (
                    <div key={`w-${wi}`} className="flex flex-col gap-[3px]">
                      {week.map((cell, di) =>
                        cell.future ? (
                          <span key={cell.date} className="h-[11px] w-[11px]" aria-hidden />
                        ) : (
                          <motion.span
                            key={cell.date}
                            initial={{ opacity: 0, scale: 0.3 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-30px" }}
                            transition={{
                              duration: 0.35,
                              delay: Math.min(wi * 0.014 + di * 0.004, 1.3),
                              ease: "easeOut",
                            }}
                            className={`heat-l${levelOf(cell.count)} block h-[11px] w-[11px] rounded-[3px] transition-transform duration-150 hover:scale-[1.35] hover:ring-1 hover:ring-foreground/30`}
                            title={
                              cell.count > 0
                                ? `${cell.count} contribution${cell.count === 1 ? "" : "s"} on ${cell.date}${cell.note ? ` — ${cell.note}` : ""}`
                                : `No contributions on ${cell.date}`
                            }
                            role="img"
                            aria-label={`${cell.count} contributions on ${cell.date}`}
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* legend */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" aria-hidden />
                Includes private commits
                {stats.best > 0 ? (
                  <span className="text-muted-foreground/70">
                    · best day: {stats.best} ({stats.bestDate})
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-1.5">
                Less
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} className={`heat-l${l} h-[10px] w-[10px] rounded-[3px]`} aria-hidden />
                ))}
                More
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

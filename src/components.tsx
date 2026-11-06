import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EVENTS, money, type Point } from './game/engine';

const ease = [0.2, 0.8, 0.2, 1] as const;

export function Odometer({ value }: { value: number }) {
  const [previous, setPrevious] = useState(value);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(() => setPrevious(value), 800);
    return () => window.clearTimeout(timer);
  }, [value]);
  return <motion.span className={`mono amount ${value > previous ? 'gain' : value < previous ? 'loss' : ''}`}
    aria-live="polite" key={value} initial={reduceMotion ? false : { opacity: .55, y: value > previous ? 4 : -4 }}
    animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? .15 : .3, ease }}>{money(value)}</motion.span>;
}

export function StartTape() {
  return <svg className="start-tape" viewBox="0 0 240 280" fill="none" aria-hidden="true">
    <path d="M28 15h184M28 26h184M39 26v215l9 8 9-8 9 8 9-8 9 8 9-8 9 8 9-8 9 8 9-8 9 8 9-8 9 8 9-8 9 8 9-8V26" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M59 57h58M59 76h122M59 94h90M59 121h122M59 142h122M59 164h122M59 193h122" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M59 216h38M142 216h39" stroke="var(--green)" strokeWidth="1.5"/>
    <circle cx="119" cy="216" r="2" fill="var(--green)"/>
  </svg>;
}

export function DayTape({ day, currentDay = day }: { day: number; currentDay?: number }) {
  const reduceMotion = useReducedMotion();
  const x = (d: number) => 10 + (d - 1) * 10;
  return <div className="day-tape" role="img" aria-label={`Day ${day} of 30`}>
    <svg viewBox="0 0 310 34" preserveAspectRatio="none" aria-hidden="true">
      <line x1="10" x2="300" y1="26" y2="26" stroke="var(--line)" strokeWidth="1"/>
      {Array.from({ length: 30 }, (_, i) => {
        const d = i + 1, event = EVENTS.find(e => e.day === d);
        return <line key={d} x1={x(d)} x2={x(d)} y1={event ? 10 : 16} y2="26"
          stroke={d < currentDay ? 'var(--ink)' : 'var(--line)'} strokeWidth={event ? 2 : 1.5}>
          <title>{event ? `Day ${d}, ${event.title}` : `Day ${d}`}</title>
        </line>;
      })}
      <motion.path d="M-4 27L0 19L4 27Z" fill="var(--green)" initial={false}
        animate={{ x: x(day) }} transition={{ duration: reduceMotion ? 0 : .6, ease }}/>
    </svg>
    <span className="mono tape-caption">Day {day} of 30</span>
  </div>;
}

export function DivergenceChart({ original, alternative, changedDay, onDay }: {
  original: Point[]; alternative: Point[]; changedDay: number; onDay: (day: number) => void;
}) {
  const [day, setDay] = useState(changedDay);
  const reduceMotion = useReducedMotion();
  const max = Math.max(1100, ...original.map(p => p.cash), ...alternative.map(p => p.cash));
  const x = (d: number) => 62 + (d - 1) * 9;
  const y = (cash: number) => 150 - cash / max * 120;
  const path = (points: Point[]) => points.map((p, i) => i ? `H${x(p.day)}V${y(p.cash)}` : `M${x(p.day)} ${y(p.cash)}`).join(' ');
  const select = (n: number) => { setDay(n); onDay(n); };
  return <div className="chart">
    <div className="chart-heading"><h2>What changed over the month</h2><span className="mono">Day {day}</span></div>
    <svg viewBox="0 0 350 184" preserveAspectRatio="none" role="img" aria-label="Cash by day, original dashed and alternative green"
      onPointerMove={e => { if (e.buttons) { const rect = e.currentTarget.getBoundingClientRect(); select(Math.max(1, Math.min(30, Math.round((e.clientX - rect.left) / rect.width * 30)))); } }}>
      {[0, .5, 1].map(f => <g key={f}><line x1="62" x2="323" y1={y(max * f)} y2={y(max * f)} stroke="var(--line)"/>
        <text x="2" y={y(max * f) - 5} fill="var(--muted)" fontSize="9" fontFamily="IBM Plex Mono">{money(max * f)}</text></g>)}
      <path d={path(original)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
      <motion.path d={path(alternative)} stroke="var(--green)" strokeWidth="2" fill="none"
        initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: reduceMotion ? .15 : .9, ease }}/>
      <line x1={x(day)} x2={x(day)} y1="27" y2="150" stroke="var(--muted)" strokeWidth="1"/>
      <circle cx={x(changedDay)} cy={y(alternative[changedDay - 1].cash)} r="3" fill="var(--green)"/>
      <text x={x(changedDay)} y="18" textAnchor="middle" fill="var(--green)" fontSize="9">You changed this</text>
      <text x="323" y={Math.min(178, y(original[29].cash) + 17)} textAnchor="end" fill="var(--ink)" fontSize="10">Original</text>
      <text x="323" y={Math.max(18, y(alternative[29].cash) - 8)} textAnchor="end" fill="var(--green)" fontSize="10">Alternative</text>
    </svg>
    <input type="range" min="1" max="30" value={day} aria-label="Compare day" onChange={e => select(Number(e.target.value))}/>
    <p className="chart-readout mono">Day {day}: original {money(original[day - 1].cash)}, alternative {money(alternative[day - 1].cash)}</p>
  </div>;
}

export function ReceiptSlip({ children, onDismiss, report = false }: { children: ReactNode; onDismiss?: () => void; report?: boolean }) {
  const reduceMotion = useReducedMotion();
  return <motion.div className={`receipt ${report ? 'report-slip' : ''}`}
    initial={reduceMotion ? false : { opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: reduceMotion ? .15 : .3, ease }}>
    {children}{onDismiss && <button className="primary" onClick={onDismiss}>Continue</button>}
  </motion.div>;
}

export function ScoreStamp({ score }: { score: number }) {
  const reduceMotion = useReducedMotion();
  return <motion.svg className="score-stamp" viewBox="0 0 144 144" role="img" aria-label={`Score ${score} out of 100`}
    initial={reduceMotion ? false : { opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: reduceMotion ? .15 : .3, ease }}>
    <circle cx="72" cy="72" r="66" fill="none" stroke="var(--ink)" strokeWidth="1.5"/>
    <circle cx="72" cy="72" r="58" fill="none" stroke="var(--ink)" strokeWidth="1"/>
    <text x="72" y="77" textAnchor="middle" fill="var(--ink)" fontFamily="IBM Plex Mono" fontSize="24">{score} / 100</text>
  </motion.svg>;
}

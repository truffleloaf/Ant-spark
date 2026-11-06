import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, History, House, RotateCcw, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGame } from './game/useGame';
import { money, type Choice } from './game/engine';
import { DayTape, DivergenceChart, Odometer, ReceiptSlip, ScoreStamp, WelcomeVisual } from './components';

type Screen = 'start' | 'split' | 'play' | 'history' | 'rewind' | 'report';
type Theme = 'light' | 'dark' | 'system';
type Accent = 'green' | 'blue' | 'violet';

function Confidence({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return <div className="segments" role="group" aria-label="Confidence from one to five">
    {[1, 2, 3, 4, 5].map(n => <button key={n} aria-pressed={value === n} className={value === n ? 'selected' : ''} onClick={() => onChange(n)}>{n}</button>)}
  </div>;
}

function ChoiceRows({ choices, selected, onSelect, cash, savings }: {
  choices: Choice[]; selected: string | null; onSelect: (choice: Choice) => void; cash: number; savings: number;
}) {
  const reduceMotion = useReducedMotion();
  return <div className="choices">{choices.map(choice => {
    const cost = -choice.cashChange, affordable = cost <= cash + savings;
    return <motion.button key={choice.id} disabled={!affordable} className={`choice ${selected === choice.id ? 'selected' : ''}`}
      whileHover={reduceMotion || !affordable ? undefined : { x: 4 }} whileTap={reduceMotion || !affordable ? undefined : { scale: .995 }} transition={{ duration: .18, ease: [0.2, 0.8, 0.2, 1] }}
      aria-pressed={selected === choice.id} onClick={() => onSelect(choice)}>
      <span className="choice-indicator" aria-hidden="true">{selected === choice.id && <Check size={13} strokeWidth={2}/>}</span>
      <span className="choice-copy"><strong>{choice.label}</strong><small>{choice.detail}</small></span>
      <span className="choice-cost mono">{cost ? `−${money(cost)}` : 'RM0'}{!affordable && <small>Not enough available</small>}{cost > cash && affordable && <small>Uses savings</small>}</span>
    </motion.button>;
  })}</div>;
}

function BalanceLedger({ cash, savings, commitments, essentials }: { cash: number; savings: number; commitments: number; essentials: number }) {
  return <div className="balance-ledger" aria-label="Current balances">
    <div className="ledger-row"><span>Wallet</span><Odometer value={cash}/></div>
    <div className="ledger-row"><span>Protected savings</span><Odometer value={savings}/></div>
    <div className="ledger-row"><span>Upcoming commitments</span><Odometer value={commitments}/></div>
    <div className="ledger-row emphasized"><span>Available to spend</span><Odometer value={Math.max(0, cash - commitments)}/></div>
    <div className="essentials-line"><div><span>Essentials covered</span><span className="mono">{essentials}%</span></div><progress max="100" value={essentials}/><small>{cash < 100 ? 'Cash is tight. You can still finish the month.' : 'You have room for the next decision.'}</small></div>
  </div>;
}

export default function App() {
  const game = useGame(), { state, config } = game;
  const {EVENTS,eligibleEvents,replay}=game.engine;
  const availableIncome=config.income-config.bills;
  const [screen, setScreen] = useState<Screen>(() => state.history.length ? state.finished ? 'report' : 'play' : 'start');
  const [savings, setSavings] = useState(game.profile.savings_goal);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [useSavings, setUseSavings] = useState(false);
  const [receipt, setReceipt] = useState<{ day: number; label: string; change: number; repair: boolean } | null>(null);
  const [rewindId, setRewindId] = useState('');
  const [alternativeId, setAlternativeId] = useState('');
  const [chartDay, setChartDay] = useState(30);
  const [returnTo, setReturnTo] = useState<'play' | 'report'>('play');
  const profile = game.profile.nickname;
  const [signInOpen, setSignInOpen] = useState(false);
  const signInDialog = useRef<HTMLDialogElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    try { const saved = localStorage.getItem('last-ringgit:theme'); return saved === 'dark' || saved === 'system' ? saved : 'light'; } catch { return 'light'; }
  });
  const [accent, setAccent] = useState<Accent>(() => {
    try { const saved = localStorage.getItem('last-ringgit:accent'); return saved === 'blue' || saved === 'violet' ? saved : 'green'; } catch { return 'green'; }
  });
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useEffect(() => {
    const dialog = signInDialog.current;
    if (signInOpen && !dialog?.open) dialog?.showModal();
    if (!signInOpen && dialog?.open) dialog.close();
  }, [signInOpen]);
  useEffect(() => {
    const dialog = settingsDialog.current;
    if (settingsOpen && !dialog?.open) dialog?.showModal();
    if (!settingsOpen && dialog?.open) dialog.close();
  }, [settingsOpen]);
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
    try { localStorage.setItem('last-ringgit:theme', theme); localStorage.setItem('last-ringgit:accent', accent); } catch { /* Preferences still work for this visit. */ }
  }, [theme, accent]);

  const current = state.currentEvent;
  const playedDecisions = state.history.filter(d => d.eventId !== 'split');
  const day = receipt?.day ?? current?.day ?? state.day;
  const rewindEvent = EVENTS.find(e => e.id === rewindId);
  const previousDecision = state.history.find(d => d.eventId === rewindId);
  const prior = rewindEvent ? replay(state.history.filter(d => d.eventId === 'split' || EVENTS.find(e => e.id === d.eventId)!.day < rewindEvent.day)) : state;
  const comparison = screen === 'rewind' && state.history.length && alternativeId ? game.rewindPreview(rewindId, alternativeId) : null;

  function openHistory() { if (screen === 'history') return; if (screen === 'rewind') { setScreen('history'); return; } setReturnTo(screen === 'report' ? 'report' : 'play'); setScreen('history'); }
  function goToPrimary() { setScreen(state.history.length ? state.finished ? 'report' : 'play' : screen === 'split' ? 'split' : 'start'); }
  function rewind(id: string) { if (id !== 'split' && !state.history.some(d => d.eventId === id)) return; setRewindId(id); setAlternativeId(''); setChartDay(30); setScreen('rewind'); }
  function confirm() {
    if (!current || !choice || (-choice.cashChange > state.cash && !useSavings)) return;
    const funding = useSavings ? 'savings' : 'cash';
    setReceipt({ day: current.day, label: choice.label, change: choice.cashChange, repair: current.id === 'friends' && choice.id === 'big' });
    game.choose(choice.id, funding);
  }

  return <div className="app min-h-screen">
    <header className={`topbar ${screen === 'start' ? 'start-topbar' : ''}`}><button className="wordmark" onClick={goToPrimary}><span className="wordmark-symbol" aria-hidden="true">L<span>R</span></span> Last Ringgit</button>
      <span className="mono top-day">{screen === 'start' ? 'One month. Your choices.' : `Day ${day} of 30`}</span>
      <nav className="app-nav" aria-label="Main navigation">
        <button aria-current={screen === 'start' || screen === 'split' || screen === 'play' || screen === 'report' ? 'page' : undefined} onClick={goToPrimary}><House size={17}/><span>{state.finished ? 'Report' : state.history.length ? 'Play' : screen === 'split' ? 'Set up' : 'Welcome'}</span></button>
        <button aria-current={screen === 'history' || screen === 'rewind' ? 'page' : undefined} disabled={!state.history.length} title={!state.history.length ? 'Play a decision to unlock history' : undefined} onClick={openHistory}><History size={17}/><span>History</span></button>
        <button aria-haspopup="dialog" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={17}/><span>Customize</span></button>
      </nav>
      <div className="header-actions">
        <button className="sign-in-trigger" onClick={() => { setSignInOpen(true); }}><UserRound size={17} strokeWidth={1.7}/><span>{profile || 'Sign in'}</span></button></div>
    </header>
    <dialog ref={signInDialog} className="sign-in-dialog" onClose={() => setSignInOpen(false)} aria-labelledby="sign-in-title">
      <button className="dialog-close" aria-label="Close sign in" onClick={() => setSignInOpen(false)}><X size={20}/></button>
      <p className="section-note mono">Your space</p><h2 id="sign-in-title">{profile}</h2>
      <p>{config.title} · {money(config.income)} a month</p>
      <p>Savings goal: {money(game.profile.savings_goal)}</p>
      <small>Your game decisions stay in this browser. Account controls are above the game.</small>
    </dialog>
    <dialog ref={settingsDialog} className="sign-in-dialog settings-dialog" onClose={() => setSettingsOpen(false)} aria-labelledby="settings-title">
      <button className="dialog-close" aria-label="Close customization" onClick={() => setSettingsOpen(false)}><X size={20}/></button>
      <p className="section-note mono">Make it yours</p><h2 id="settings-title">Customize</h2>
      <p>Choose a look that feels comfortable. Your choices stay on this device.</p>
      <fieldset><legend>Appearance</legend><div className="setting-options">
        {(['light', 'dark', 'system'] as const).map(value => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </div></fieldset>
      <fieldset><legend>Accent color</legend><div className="setting-options accent-options">
        {(['green', 'blue', 'violet'] as const).map(value => <button key={value} type="button" aria-pressed={accent === value} onClick={() => setAccent(value)}><span className={`accent-swatch ${value}`}/>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </div></fieldset>
      <small>Motion follows your device’s reduced motion setting.</small>
    </dialog>
    <main>
      {game.storageError && <p role="alert">{game.storageError}</p>}
      {screen === 'start' && <section className="start-screen">
        <div className="start-hero"><div className="hero-copy"><p className="hero-kicker mono"><span/>A game about real choices</p><h1>Make your money <em>last.</em></h1><p className="lead">One month. Your choices. Every ringgit counts.</p><p className="hero-description">Choose how to spend, handle surprises, then rewind a decision to see how the month could have gone.</p><div className="hero-jump"><a href="#before-you-start">Set up your month <ArrowRight size={18}/></a><span className="mono">About 5 minutes</span></div></div><WelcomeVisual/></div>
        <div className="start-form" id="before-you-start"><div className="form-heading"><span className="mono">01 / Set up</span><h2>Start with what you know</h2><p>No right answer. You can see how your choices play out.</p></div><p>How confident are you managing everyday money?</p><Confidence value={game.confidence.before} onChange={n => game.setConfidence('before', n)}/>
          <div className="scenarios"><div className="scenario active"><span>{config.title}</span><span className="mono">{money(config.income)} a month</span></div><p className="quiet">Chosen for {game.profile.nickname}: {money(config.bills)} bills, {money(config.dailyBaseline)} daily essentials, and a {money(game.profile.savings_goal)} savings goal.</p></div>
          <button className="primary start-cta" onClick={() => setScreen('split')}>Start the month <ArrowRight size={18}/></button>
        </div>
      </section>}

      {screen === 'split' && <section className="narrow-screen">
        <p className="section-note mono">Day 1 / Income arrives</p><h1>Split your income</h1><p className="lead">Set aside what you want to protect. Your simulated bills are {money(config.bills)}.</p>
        <div className="split-bar" role="img" aria-label={`${money(savings)} savings, ${money(availableIncome - savings)} cash, ${money(config.bills)} bills`}><span style={{ width: `${savings / config.income * 100}%` }}/><span style={{ width: `${(availableIncome - savings) / config.income * 100}%` }}/><span style={{ width: `${config.bills / config.income * 100}%` }}/></div>
        <div className="ledger"><div className="ledger-row"><span>Protected savings</span><Odometer value={savings}/></div><div className="ledger-row"><span>Cash for the month</span><Odometer value={availableIncome - savings}/></div><div className="ledger-row"><span>Set aside for bills</span><span className="mono">{money(config.bills)}</span></div></div>
        <label className="input-label" htmlFor="savings-number">Savings amount</label><input id="savings-number" className="number-input mono" type="number" min="0" max="500" step="10" value={savings} onChange={e => setSavings(Math.max(0, Math.min(500, Math.round(Number(e.target.value) / 10) * 10)))}/>
        <input className="savings-range" aria-label="Adjust savings" type="range" min="0" max="500" step="10" value={savings} onChange={e => setSavings(Number(e.target.value))}/>
        <p className="quiet">{savings ? `${money(savings)} savings, ${money(availableIncome - savings)} cash, ${money(config.bills)} bills.` : 'Nothing set aside. You can still continue.'}</p>
        <div className="actions"><button className="primary" onClick={() => { game.setSplit(savings); setScreen('play'); }}>Lock in the split</button></div>
      </section>}

      {screen === 'play' && receipt && <section className="consequence-screen"><DayTape day={receipt.day}/><ReceiptSlip onDismiss={() => { setReceipt(null); setChoice(null); setUseSavings(false); if (state.finished) setScreen('report'); }}>
        <p className="section-note mono">Day {receipt.day} / Decision recorded</p><h2>{receipt.label}</h2>
        <div className="ledger"><div className="ledger-row"><span>{receipt.label}</span><span className={`mono ${receipt.change < 0 ? 'negative' : ''}`}>{receipt.change < 0 ? `−${money(-receipt.change)}` : money(receipt.change)}</span></div><div className="ledger-row"><span>Wallet at next decision</span><Odometer value={state.cash}/></div><div className="ledger-row"><span>Protected savings</span><Odometer value={state.savings}/></div></div>
        {receipt.repair && <p className="quiet">This may affect Day 18.</p>}
      </ReceiptSlip></section>}

      {screen === 'play' && !receipt && current && <section><DayTape day={day}/><div className="play-layout">
        <div className="mobile-balance"><BalanceLedger cash={state.cash} savings={state.savings} commitments={state.commitments} essentials={state.essentials}/></div>
        <div className="event-sheet"><p className="section-note mono">Day {day} / Decision {state.history.length} of {eligibleEvents(state.history).length}</p><h1>{current.title}</h1><p className="lead">{current.description}</p>
          <ChoiceRows choices={current.choices} selected={choice?.id ?? null} cash={state.cash} savings={state.savings} onSelect={c => { setChoice(c); setUseSavings(false); }}/>
          {choice && <motion.div className="choice-preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, ease: [0.2, 0.8, 0.2, 1] }} key={choice.id} aria-live="polite">
            <span>Immediately after paying</span><strong className="mono">{-choice.cashChange > state.cash ? 'Protected savings needed' : `${money(Math.max(0, state.cash + choice.cashChange))} in your wallet`}</strong>
          </motion.div>}
          {choice && -choice.cashChange > state.cash && <label className="savings-option"><input type="checkbox" checked={useSavings} onChange={e => setUseSavings(e.target.checked)}/> Use protected savings for this choice</label>}
          <div className="actions"><button className="primary" disabled={!choice || (-choice.cashChange > state.cash && !useSavings)} onClick={confirm}>Confirm choice</button></div>
        </div><aside className="desktop-balance"><BalanceLedger cash={state.cash} savings={state.savings} commitments={state.commitments} essentials={state.essentials}/></aside>
      </div></section>}
      {screen === 'play' && !receipt && state.finished && <section className="narrow-screen"><h1>The month is complete</h1><button className="primary" onClick={() => setScreen('report')}>See your report</button></section>}

      {screen === 'history' && <section className="history-screen"><button className="back" onClick={() => setScreen(returnTo)}><ArrowLeft size={16}/> Back</button><p className="section-note mono">Your decisions</p><h1>History and rewind</h1><p className="lead">Choose a decision to see what might have changed.</p>
        {playedDecisions.length ? <><div className="history-head mono"><span>Day</span><span>Decision</span><span>Amount</span></div>
        <div className="history-list">{playedDecisions.map(d => { const event = EVENTS.find(e => e.id === d.eventId)!; const picked = event.choices.find(c => c.id === d.choiceId)!; return <div className="history-row" key={d.eventId}><span className="mono">{event.day}</span><span><strong>{event.title}</strong><small>{picked.label}</small></span><span className="mono">{picked.cashChange ? `−${money(-picked.cashChange)}` : 'RM0'}</span><button onClick={() => rewind(d.eventId)}><RotateCcw size={16} strokeWidth={1.5}/> Rewind to here</button></div>; })}</div></> : <p className="history-empty">Your choices will appear here as you play. You can still revisit your salary split.</p>}
        <button className="text-button" onClick={() => rewind('split')}>Rewind to Day 1 split</button>
      </section>}

      {screen === 'rewind' && <section className="rewind-screen"><button className="back" onClick={() => setScreen('history')}><ArrowLeft size={16}/> History</button><p className="section-note mono">Rewind / Day {rewindEvent?.day ?? 1}</p><h1>Rewind to Day {rewindEvent?.day ?? 1}: {rewindEvent?.title ?? 'The salary split'}</h1>
        <DayTape day={rewindEvent?.day ?? 1} currentDay={day}/>
        <div className="rewind-choices">{rewindId === 'split' ? <label className="input-label">Alternative savings <input className="savings-range" type="range" min="0" max="500" step="10" value={alternativeId || previousDecision?.choiceId || '200'} onChange={e => setAlternativeId(e.target.value)}/><span className="mono">{money(Number(alternativeId || previousDecision?.choiceId || 200))}</span></label> : rewindEvent && <ChoiceRows choices={rewindEvent.choices} selected={alternativeId || previousDecision?.choiceId || null} cash={prior.cash} savings={prior.savings} onSelect={c => setAlternativeId(c.id)}/>}</div>
        {comparison && <><DivergenceChart original={comparison.original} alternative={comparison.alternative} changedDay={rewindEvent?.day ?? 1} onDay={setChartDay}/>
          <div className="comparison"><div className="comparison-column"><h3>Original</h3><div className="ledger-row"><span>End balance</span><Odometer value={comparison.originalEnd}/></div><div className="ledger-row"><span>Protected savings</span><Odometer value={comparison.original[chartDay - 1].savings}/></div><div className="ledger-row"><span>Emergency buffer</span><Odometer value={comparison.originalEnd}/></div></div>
            <div className="comparison-column alternative"><h3>Alternative</h3><div className="ledger-row"><span>End balance</span><Odometer value={comparison.alternativeEnd}/></div><div className="ledger-row"><span>Protected savings</span><Odometer value={comparison.alternative[chartDay - 1].savings}/></div><div className="ledger-row"><span>Emergency buffer</span><Odometer value={comparison.alternativeEnd}/></div><p className={`difference mono ${comparison.alternativeEnd >= comparison.originalEnd ? 'positive' : 'negative'}`}>{money(comparison.alternativeEnd - comparison.originalEnd)} from the original</p></div></div>
          <p className="insight">{comparison.insight}</p><div className="rewind-actions"><button className="primary" onClick={() => { game.applyRewind(rewindId, alternativeId); setScreen('report'); }}>Keep this timeline</button><button className="text-button" onClick={() => setAlternativeId('')}>Back to original</button></div>
        </>}
      </section>}

      {screen === 'report' && game.report && <section className="report-screen"><ReceiptSlip report><p className="section-note mono">Your 30-day report</p><div className="report-heading"><h1>Month complete</h1><ScoreStamp score={game.report.score}/></div>
        <div className="ledger report-breakdown">{game.report.breakdown.map(line => <div className="ledger-row" key={line.label}><span>{line.label}<small>{line.reason}</small></span><span className="mono">{line.points} / {line.max}</span></div>)}</div>
        <div className="ledger report-totals"><div className="ledger-row"><span>End balance</span><Odometer value={game.report.endBalance}/></div><div className="ledger-row"><span>Protected savings</span><Odometer value={game.report.savings}/></div><div className="ledger-row"><span>Essentials covered</span><span className="mono">{game.report.essentialsCoveredPct}%</span></div><div className="ledger-row"><span>Emergency preparedness</span><span>{game.report.emergencyPreparedness}</span></div></div>
        <p>Unmet daily essentials: <strong>{money(state.unpaidEssentials)}</strong>. Unpaid costs reduce essentials coverage.</p><p>Savings goal: {money(game.profile.savings_goal)} · {state.savings >= game.profile.savings_goal ? "Goal reached" : `${money(game.profile.savings_goal-state.savings)} still to go`}</p><h2>Your money habit</h2><h3>{game.report.personality.name}</h3><p>{game.report.personality.text}</p><h2>Next steps</h2><ol className="next-steps">{game.report.nextSteps.map(step => <li key={step}>{step}</li>)}</ol>
        <h2>How confident do you feel now?</h2><p className="quiet">Before: <span className="mono">{game.confidence.before ?? 'Not answered'}</span></p><Confidence value={game.confidence.after} onChange={n => game.setConfidence('after', n)}/>
        <div className="report-actions">{game.hasOriginal && <button className="text-button" onClick={()=>{game.restoreOriginal();setScreen('play');}}>Restore original timeline</button>}<button className="primary" onClick={openHistory}>Rewind a decision</button><button className="text-button" onClick={() => { setAlternativeId(''); setRewindId(''); game.reset(); setScreen('start'); }}>Play again</button></div><p className="disclaimer">Scenario amounts are illustrative. This score is a learning game indicator, not a credit score.</p>
      </ReceiptSlip></section>}
    </main>
  </div>;
}

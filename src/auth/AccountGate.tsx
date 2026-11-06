import {createContext, useContext, useEffect, useState, FormEvent, ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from './client';
import {defaultProfile, incomeOptions, PlayerProfile, validProfile} from '../game/profile';

const PlayerContext = createContext({userId: 'demo', profile: {...defaultProfile, nickname: 'Demo player'}});
export const usePlayer = () => useContext(PlayerContext);

export function AccountGate({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileOwner, setProfileOwner] = useState('');
  const [draft, setDraft] = useState<PlayerProfile>(defaultProfile);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [demo, setDemo] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({data, error}) => {
      if (!active) return;
      if (error) setError(error.message);
      setSession(data.session); setLoading(false);
    }).catch(e => {if (active) {setError(String(e)); setLoading(false);}});
    const {data: {subscription}} = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next); setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {setProfile(null); setRecovery(false); setPassword('');}
    });
    return () => {active = false; subscription.unsubscribe();};
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    setProfile(null); setProfileLoading(true); setError('');
    Promise.resolve(supabase.from('profiles').select('nickname,life_stage,income,savings_goal').eq('id', userId).maybeSingle())
      .then(({data, error}) => {
        if (!active) return;
        if (error) setError('Could not load your profile. Please retry. ' + error.message);
        else if (data && validProfile(data)) {setProfile(data); setDraft(data);setProfileOwner(userId);}
        else setDraft(defaultProfile);
        setProfileLoading(false);
      }).catch(e=>{if(active){setError('Could not load your profile. Please retry. '+String(e));setProfileLoading(false);}});
    return () => {active = false;};
  }, [userId, retry]);

  async function authenticate(event: FormEvent) {
    event.preventDefault(); if (!supabase || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (recovery) {
        const {error} = await supabase.auth.updateUser({password});
        if (error) throw error;
        setRecovery(false); setPassword(''); setMessage('Password updated.');
      } else if (mode === 'reset') {
        const {error} = await supabase.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
        if (error) throw error;
        setMessage('If this address has an account, check your inbox for a reset link.');
      } else if (mode === 'signup') {
        const {data, error} = await supabase.auth.signUp({email, password, options: {emailRedirectTo: location.origin + location.pathname}});
        if (error) throw error;
        setPassword('');
        if (!data.session) setMessage('Check your email to confirm your account, then sign in.');
      } else {
        const {error} = await supabase.auth.signInWithPassword({email, password});
        if (error) throw error;
        setPassword('');
      }
    } catch (e) {setError(e instanceof Error ? e.message : 'Connection failed. Please retry.');}
    finally {setBusy(false);}
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); const next = {...draft, nickname: draft.nickname.trim()};
    if (!supabase || !userId || !validProfile(next) || busy) return;
    setBusy(true); setError('');
    try {
      const {error} = await supabase.from('profiles').upsert({id: userId, ...next});
      if (error) throw error;
      setProfile(next);setProfileOwner(userId);
    } catch (e) {setError(e instanceof Error ? e.message : 'Could not save your profile.');}
    finally {setBusy(false);}
  }

  async function signOut() {
    if (!supabase) return;
    const {error} = await supabase.auth.signOut();
    if (error) setError(error.message);
  }

  if (loading) return <div className="account-card"><h1>Last Ringgit</h1><p role="status">Restoring your session…</p></div>;
  if (demo) return <PlayerContext.Provider value={{userId: 'demo', profile: {...defaultProfile, nickname: 'Demo player'}}}><div className="account-strip"><span>Demo · progress stays in this browser</span><button onClick={()=>setDemo(false)}>Back to sign in</button></div>{children}</PlayerContext.Provider>;
  if (session && profile && profileOwner === session.user.id && !recovery) return <PlayerContext.Provider value={{userId: session.user.id, profile}}><div className="account-strip"><span>{profile.nickname} · {profile.life_stage === 'student' ? 'Student allowance' : 'First salary'} · goal RM{profile.savings_goal}</span><button onClick={signOut}>Sign out</button></div>{error && <p role="alert" className="account-error">{error}</p>}{children}</PlayerContext.Provider>;
  return <div className="account-card">
    <p className="kicker mono">Confidence with everyday money</p><h1>Last Ringgit</h1>
    <p className="lead">Make your first money mistakes here. Learn. Rewind. Try again.</p>
    {!supabase ? <><h2>Try the game</h2><p>Account sign-in is not connected yet. You can explore a clearly labelled demo.</p><button className="primary" onClick={()=>setDemo(true)}>Try demo</button></> : recovery || !session ? <>
      <h2>{recovery ? 'Choose a new password' : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2>
      <form onSubmit={authenticate} className="account-form">
        {!recovery && <label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>}
        {(recovery || mode !== 'reset') && <label>Password<input required type="password" minLength={8} autoComplete={recovery || mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e=>setPassword(e.target.value)} /><small>At least 8 characters.</small></label>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : recovery ? 'Update password' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
      </form>
      {!recovery && <div className="account-links"><button onClick={()=>{setMode(mode === 'signup' ? 'login' : 'signup');setMessage('');setError('');}}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button><button onClick={()=>{setMode(mode === 'reset' ? 'login' : 'reset');setMessage('');setError('');}}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button><button onClick={()=>setDemo(true)}>Explore demo without an account</button></div>}
    </> : profileLoading ? <p role="status">Loading your profile…</p> : <>
      <h2>Make this month yours</h2><p>Use a fictional profile or estimates. These choices shape your simulated month.</p>
      <form className="account-form" onSubmit={saveProfile}>
        <label>Nickname<input required maxLength={40} autoComplete="nickname" value={draft.nickname} onChange={e=>setDraft({...draft,nickname:e.target.value})}/></label>
        <label>Your situation<select value={draft.life_stage} onChange={e=>{const stage=e.target.value as PlayerProfile['life_stage'];setDraft({...draft,life_stage:stage,income:incomeOptions[stage][0]});}}><option value="student">Student receiving an allowance</option><option value="working">Starting work / first salary</option></select></label>
        <label>Simulated monthly income<select value={draft.income} onChange={e=>setDraft({...draft,income:Number(e.target.value)})}>{incomeOptions[draft.life_stage].map(n=><option key={n} value={n}>RM{n}</option>)}</select></label>
        <label>Savings goal (RM)<input type="number" min={0} max={500} step={10} required value={draft.savings_goal} onChange={e=>setDraft({...draft,savings_goal:Number(e.target.value)})}/></label>
        <small>Your profile is saved to your account. Game decisions stay in this browser, separately for each account.</small>
        <button className="primary" disabled={busy || !validProfile(draft)}>{busy ? 'Saving…' : 'Start my journey'}</button>
      </form><div className="account-links"><button onClick={()=>setRetry(n=>n+1)}>Retry loading profile</button><button onClick={signOut}>Sign out</button></div>
    </>}
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="account-error">{error}</p>}
  </div>;
}

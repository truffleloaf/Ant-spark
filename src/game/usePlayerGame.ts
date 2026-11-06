import {useMemo, useState} from 'react';
import {createGameEngine} from './engine';
import {gameConfig} from './profile';
import {usePlayer} from '../auth/AccountGate';
import {restoreSave,saveKey,Stored} from './session';

export function useGame() {
  const player = usePlayer();
  const key = saveKey(player.userId);
  const [storageError, setStorageError] = useState('');
  const [data, setData] = useState<Stored>(() => {
    try {return restoreSave(localStorage.getItem(key), player.profile);}
    catch {return restoreSave(null, player.profile);}
  });
  const config = useMemo(()=>gameConfig(data.profile), [data.profile]);
  const engine = useMemo(()=>createGameEngine(config), [config]);
  const state = engine.replay(data.history);
  const save = (next: Stored) => {
    try {localStorage.setItem(key, JSON.stringify(next)); setStorageError('');}
    catch {setStorageError('Your browser could not save progress. You can keep playing, but progress may be lost when this page closes.');}
    setData(next);
  };
  return {state, config, engine, profile: data.profile, storageError, hasOriginal: !!data.originalHistory,
    choose: (choiceId: string, fundedFrom?: 'cash' | 'savings') => {
      if (state.currentEvent) save({...data, history: engine.replay([...state.history, {eventId: state.currentEvent.id, choiceId, fundedFrom}]).history});
    },
    setSplit: (n: number) => save({...data, history: engine.setSplit([], n), originalHistory: undefined}),
    rewindPreview: (eventId: string, choiceId: string) => engine.rewindPreview(data.history, eventId, choiceId),
    applyRewind: (eventId: string, choiceId: string) => save({...data, originalHistory: data.originalHistory || [...data.history], history: engine.editedHistory(data.history, eventId, choiceId)}),
    restoreOriginal: () => {if (data.originalHistory) save({...data, history: data.originalHistory, originalHistory: undefined});},
    report: state.finished ? engine.score(state) : null,
    reset: () => save({history: [], profile: player.profile, confidence: {before: null, after: null}}),
    confidence: data.confidence,
    setConfidence: (which: 'before' | 'after', n: number) => {if (Number.isInteger(n) && n >= 1 && n <= 5) save({...data, confidence: {...data.confidence, [which]: n}});}
  };
}

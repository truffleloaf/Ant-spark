import {createGameEngine, Decision} from './engine';
import {gameConfig, PlayerProfile, validProfile} from './profile';
export type Stored = {history: Decision[]; originalHistory?: Decision[]; profile: PlayerProfile; confidence: {before: number | null; after: number | null}};
export const saveKey = (userId: string) => `last-ringgit:v2:${userId}`;
export function restoreSave(raw: string | null, profile: PlayerProfile): Stored {
  const empty: Stored = {history: [], profile, confidence: {before: null, after: null}};
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || !validProfile(value.profile) || !Array.isArray(value.history)) return empty;
    const engine = createGameEngine(gameConfig(value.profile));
    const validDecisions = (items: unknown): items is Decision[] => Array.isArray(items) && items.every(d => d && typeof d.eventId === 'string' && typeof d.choiceId === 'string' && (d.fundedFrom === undefined || d.fundedFrom === 'cash' || d.fundedFrom === 'savings'));
    if (!validDecisions(value.history)) return empty;
    const rating = (n: unknown) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 5 ? Number(n) : null;
    return {history: engine.replay(value.history).history, profile: value.profile,
      originalHistory: validDecisions(value.originalHistory) ? engine.replay(value.originalHistory).history : undefined,
      confidence: {before: rating(value.confidence?.before), after: rating(value.confidence?.after)}};
  } catch {return empty;}
}

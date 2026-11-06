import {describe,it,expect} from 'vitest';
import {EVENTS,replay,rewindPreview,score,setSplit,eligibleEvents,complete,timeline,editedHistory,affordable} from './engine';
const start=setSplit([],200);
describe('game engine',()=>{
 it('replays deterministically',()=>expect(replay(complete(start))).toEqual(replay(complete(start))));
 it('always offers an affordable choice and finishes without negative cash',()=>{for(const savings of [0,200,500]){let h=setSplit([],savings);while(!replay(h).finished){const s=replay(h);expect(s.currentEvent!.choices.some(c=>affordable(c,s))).toBe(true);const c=s.currentEvent!.choices.find(c=>affordable(c,s))!;h=[...s.history,{eventId:s.currentEvent!.id,choiceId:c.id,fundedFrom:-c.cashChange>s.cash?'savings':'cash'}]}expect(replay(h).cash).toBeGreaterThanOrEqual(0)}});
 it('Day 18 follows only the Day 5 spending condition',()=>{expect(eligibleEvents([...start,{eventId:'friends',choiceId:'big'}]).some(e=>e.id==='repair')).toBe(true);expect(eligibleEvents([...start,{eventId:'friends',choiceId:'cheap'}]).some(e=>e.id==='repair')).toBe(false)});
 it('rewind matches a fresh replay of the edited history',()=>{const h=complete([...start,{eventId:'groceries',choiceId:'basic'},{eventId:'friends',choiceId:'big'}]);const r=rewindPreview(h,'friends','skip');expect(r.alternative).toEqual(timeline(editedHistory(h,'friends','skip')));expect(replay(editedHistory(h,'friends','skip')).cash+replay(editedHistory(h,'friends','skip')).savings).toBe(r.alternativeEnd)});
 it('same choice leaves balances unchanged',()=>{const h=complete(start),id=h.find(d=>d.eventId==='flash')!.choiceId;const r=rewindPreview(h,'flash',id);expect(r.alternativeEnd).toBe(r.originalEnd)});
 it('score lines sum within their maximums',()=>{const report=score(replay(complete(start)));expect(report.score).toBe(report.breakdown.reduce((n,b)=>n+b.points,0));report.breakdown.forEach(b=>{expect(b.points).toBeGreaterThanOrEqual(0);expect(b.points).toBeLessThanOrEqual(b.max)})});
 it('insight amounts come from the replays',()=>{const r=rewindPreview(complete(start),'flash','buy');const amounts=[...r.original,...r.alternative].flatMap(p=>[p.cash,p.savings,p.cash+p.savings]);const mentioned=[...r.insight.matchAll(/RM([\d,]+)/g)].map(m=>Number(m[1].replace(/,/g,'')));expect(mentioned.every(n=>amounts.includes(n))).toBe(true)});
 it('has the requested events',()=>expect(EVENTS.map(e=>e.day)).toEqual([3,5,8,12,16,18,20,24,27]));
});

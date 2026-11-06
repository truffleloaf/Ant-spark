import {describe,expect,it} from 'vitest';
import {createGameEngine,Decision} from './engine';
import {defaultProfile,gameConfig,incomeOptions,validProfile} from './profile';
import {restoreSave,saveKey} from './session';

describe('personalized game integrity',()=>{
  it('keeps every budget playable through varied choices, and replay matches its chart',()=>{
    for(const life_stage of ['student','working'] as const) for(const income of incomeOptions[life_stage]) {
      const engine=createGameEngine(gameConfig({...defaultProfile,life_stage,income}));
      for(const saved of [0,200,500]) for(let route=0;route<40;route++) {
        let h:Decision[]=engine.setSplit([],saved);
        for(let step=0;step<10;step++) {
          const state=engine.replay(h); if(state.finished)break;
          const available=state.currentEvent!.choices.filter(c=>engine.affordable(c,state));
          expect(available.length).toBeGreaterThan(0);
          const choice=available[(route+step)%available.length];
          h=[...state.history,{eventId:state.currentEvent!.id,choiceId:choice.id,fundedFrom:-choice.cashChange>state.cash?'savings':'cash'}];
        }
        const state=engine.replay(h),last=engine.timeline(h)[29];
        expect(state.finished).toBe(true);expect(state.cash).toBeGreaterThanOrEqual(0);
        expect(last.cash).toBe(state.cash);expect(last.savings).toBe(state.savings);
      }
    }
  });
  it('changes budgets and stories for students',()=>{
    const student=createGameEngine(gameConfig({...defaultProfile,life_stage:'student',income:1200}));
    expect(student.replay(student.setSplit([],200)).dailyBaseline).toBe(10);
    expect(student.EVENTS[0].description).toContain('hostel');
  });
  it('records unmet daily needs when cash runs out',()=>{
    const e=createGameEngine();let h=e.setSplit([],0);
    for(let step=0;step<10;step++) {const s=e.replay(h);if(s.finished)break;const c=s.currentEvent!.choices.filter(c=>e.affordable(c,s)).sort((a,b)=>a.cashChange-b.cashChange)[0];h=[...s.history,{eventId:s.currentEvent!.id,choiceId:c.id,fundedFrom:'savings'}];}
    const s=e.replay(h);expect(s.unpaidEssentials).toBeGreaterThan(0);expect(s.essentials).toBeLessThan(100);
  });
  it('preserves input history when computing a rewind',()=>{
    const e=createGameEngine(),h=e.complete(e.setSplit([],200)),original=JSON.stringify(h);
    e.editedHistory(h,'flash','buy');expect(JSON.stringify(h)).toBe(original);
  });
  it('rejects malformed profiles and recovers corrupt browser saves',()=>{
    const p={...defaultProfile,nickname:'Tester'};
    expect(validProfile({...p,income:-100})).toBe(false);
    expect(restoreSave('{bad',p).history).toEqual([]);
    expect(restoreSave(JSON.stringify({profile:p,history:[null]}),p).history).toEqual([]);
    expect(saveKey('alice')).not.toBe(saveKey('bob'));
  });
});

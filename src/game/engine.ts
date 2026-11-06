import {SCENARIOS} from './scenarios';
import {GameConfig,gameConfig,defaultProfile} from './profile';
const studentDescriptions:Record<string,string>={groceries:'Your hostel food supplies are running low. Budget for the weeks ahead.',friends:'Your course mates are celebrating after exams. Choose a plan that fits your allowance.',phone:'Your phone is needed for class updates and assignments. It needs a repair.',transport:'Your usual bus to campus is unavailable today. How will you get there?'};
export type Choice={id:string;label:string;detail:string;cashChange:number;savingsChange:number;essentialsChange:number;tags?:('essential'|'nonessential'|'savings'|'emergency')[]};
export type GameEvent={id:string;day:number;title:string;description:string;choices:Choice[];condition?:{eventId:string;minSpend?:number;choiceId?:string}};
export type Decision={eventId:string;choiceId:string;fundedFrom?:'cash'|'savings'};
export type Point={day:number;cash:number;savings:number};
export type GameState={day:number;cash:number;savings:number;commitments:number;essentials:number;dailyBaseline:number;unpaidEssentials:number;history:Decision[];currentEvent:GameEvent|null;finished:boolean};
export type RewindResult={original:Point[];alternative:Point[];originalEnd:number;alternativeEnd:number;insight:string};
export type Report={score:number;breakdown:{label:string;points:number;max:number;reason:string}[];endBalance:number;savings:number;essentialsCoveredPct:number;emergencyPreparedness:'Low'|'Moderate'|'High';personality:{name:string;text:string};nextSteps:string[]};
export function createGameEngine(config: GameConfig = gameConfig(defaultProfile)) {
const EVENTS:GameEvent[] = SCENARIOS.map(event => ({...event, choices: event.choices.map(choice=>({...choice})), description: config.lifeStage === "student" ? (studentDescriptions[event.id] || event.description) : event.description}));
const spend=(d:Decision,ev:GameEvent)=>Math.max(0,-(ev.choices.find(x=>x.id===d.choiceId)?.cashChange||0));
function exists(ev:GameEvent,h:Decision[]){if(!ev.condition)return true;const d=h.find(x=>x.eventId===ev.condition!.eventId);const parent=EVENTS.find(x=>x.id===ev.condition!.eventId);return !!d&&spend(d,parent!)>=(ev.condition.minSpend||0)&&(ev.condition.choiceId?d.choiceId===ev.condition.choiceId:true)}
const eligibleEvents=(h:Decision[])=>EVENTS.filter(e=>exists(e,h));
const money=(n:number)=>`${n<0?'−':''}RM${Math.abs(Math.round(n)).toLocaleString('en-MY')}`;
function affordable(choice:Choice,state:GameState){const cost=-choice.cashChange;return cost<=state.cash||cost<=state.cash+state.savings}
function replay(history:Decision[],scenario='First Job'):GameState{
 if(scenario!=='First Job')throw new Error('Unknown scenario');
 const split=history.find(d=>d.eventId==='split');const amount=Number(split?.choiceId);
 if(!split||!Number.isInteger(amount)||amount<0||amount>500||amount%10)return {day:1,cash:0,savings:0,commitments:config.bills,essentials:100,dailyBaseline:config.dailyBaseline,unpaidEssentials:0,history:[],currentEvent:null,finished:false};
 let cash=config.income-config.bills-amount,savings=amount,essentials=100,day=1,unpaidEssentials=0;const advanceDay=()=>{day++;const shortfall=Math.max(0,config.dailyBaseline-cash);unpaidEssentials+=shortfall;essentials=Math.max(0,essentials-shortfall/config.dailyBaseline*5);cash=Math.max(0,cash-config.dailyBaseline)};const kept:Decision[]=[{eventId:'split',choiceId:String(amount)}];
 for(const ev of EVENTS){if(!exists(ev,kept))continue;while(day<ev.day){advanceDay()}
 const d=history.find(x=>x.eventId===ev.id);if(!d)return {day,cash,savings,commitments:0,essentials:Math.round(essentials),dailyBaseline:config.dailyBaseline,unpaidEssentials,history:kept,currentEvent:ev,finished:false};
 const ch=ev.choices.find(x=>x.id===d.choiceId);if(!ch||-ch.cashChange>cash+savings||(-ch.cashChange>cash&&d.fundedFrom!=='savings'))return {day,cash,savings,commitments:0,essentials:Math.round(essentials),dailyBaseline:config.dailyBaseline,unpaidEssentials,history:kept,currentEvent:ev,finished:false};
 const cost=-ch.cashChange;const fromSavings=d.fundedFrom==='savings'||cost>cash;
 if(fromSavings){const drawn=Math.min(savings,cost);savings-=drawn;cash-=cost-drawn}else cash-=cost;
 essentials=Math.max(0,Math.min(100,essentials+ch.essentialsChange));kept.push({...d,fundedFrom:fromSavings&&cost>0?'savings':'cash'});
 }
 while(day<30){advanceDay()}
 return {day:30,cash,savings,commitments:0,essentials:Math.round(essentials),dailyBaseline:config.dailyBaseline,unpaidEssentials,history:kept,currentEvent:null,finished:true};
}
function setSplit(history:Decision[],saved:number):Decision[]{if(!Number.isInteger(saved)||saved<0||saved>500||saved%10)throw new Error('Savings must be RM0 to RM500 in RM10 steps');return [{eventId:'split',choiceId:String(saved)},...history.filter(x=>x.eventId!=='split')]}
// Complete a timeline by reusing valid later decisions, then taking the cheapest affordable choice.
function complete(history:Decision[]):Decision[]{let h=history.filter(d=>d.eventId==='split');for(let i=0;i<EVENTS.length+1;i++){const s=replay(h);if(s.finished)break;const ev=s.currentEvent;if(!ev)break;const old=history.find(d=>d.eventId===ev.id);const wanted=ev.choices.find(c=>c.id===old?.choiceId&&affordable(c,s));const choice=wanted||[...ev.choices].sort((a,b)=>b.cashChange-a.cashChange).find(c=>affordable(c,s));if(!choice)throw new Error(`No affordable choice on Day ${ev.day}`);h=[...s.history,{eventId:ev.id,choiceId:choice.id,fundedFrom:-choice.cashChange>s.cash?'savings':old?.fundedFrom}]}return replay(h).history}
function timeline(history:Decision[]):Point[]{const full=complete(history);const savings=Number(full[0].choiceId);let cash=config.income-config.bills-savings,saved=savings;const points:Point[]=[{day:1,cash,savings:saved}];for(let day=2;day<=30;day++){cash=Math.max(0,cash-config.dailyBaseline);for(const ev of EVENTS.filter(e=>e.day===day&&exists(e,full))){const d=full.find(x=>x.eventId===ev.id)!;const ch=ev.choices.find(x=>x.id===d.choiceId)!;const cost=-ch.cashChange;if(d.fundedFrom==='savings'||cost>cash){const draw=Math.min(saved,cost);saved-=draw;cash=Math.max(0,cash-(cost-draw))}else cash-=cost}points.push({day,cash,savings:saved})}return points}
function editedHistory(history:Decision[],eventId:string,newChoiceId:string):Decision[]{if(eventId==='split')return complete(setSplit(history,Number(newChoiceId)));const changed=history.map(d=>d.eventId===eventId?{...d,choiceId:newChoiceId,fundedFrom:undefined}:d);if(!history.some(d=>d.eventId===eventId))throw new Error('Decision not found');return complete(changed)}
function rewindPreview(history:Decision[],eventId:string,newChoiceId:string):RewindResult{const o=timeline(history),a=timeline(editedHistory(history,eventId,newChoiceId));const oldEnd=o[29].cash+o[29].savings,newEnd=a[29].cash+a[29].savings;const changed=eventId==='split'?1:EVENTS.find(e=>e.id===eventId)?.day||1;const conditional=eligibleEvents(editedHistory(history,eventId,newChoiceId)).some(e=>e.id==='repair')!==eligibleEvents(history).some(e=>e.id==='repair');return {original:o,alternative:a,originalEnd:oldEnd,alternativeEnd:newEnd,insight:`Later choices are reused when affordable; otherwise the cheapest available option is selected. Decision-linked events may change. Day ${changed}: the alternative ends at ${money(newEnd)} instead of ${money(oldEnd)}.${conditional?' The Day 18 repair bill changes too.':''}`}}
function score(s:GameState):Report{
 const choices=s.history.filter(d=>d.eventId!=='split').map(d=>EVENTS.find(e=>e.id===d.eventId)!.choices.find(c=>c.id===d.choiceId)!);
 const wants=choices.filter(c=>c.tags?.includes('nonessential')).reduce((n,c)=>n-c.cashChange,0);
 const buffer=s.cash+s.savings;
 const b=[
  {label:'Essentials covered',points:Math.round(s.essentials*.3),max:30,reason:`Essentials ended at ${s.essentials}%.`},
  {label:'Protected savings kept',points:Math.min(25,Math.round(s.savings/20)),max:25,reason:`${money(s.savings)} remains protected.`},
  {label:'Emergency preparedness',points:Math.min(20,Math.round(buffer/180*20)),max:20,reason:`Your ${money(buffer)} buffer is compared with the largest ${money(180)} emergency.`},
  {label:'Restraint on nonessential spending',points:Math.max(0,15-Math.round(wants/25)),max:15,reason:`You spent ${money(wants)} on nonessential choices.`},
  {label:'End balance',points:Math.min(10,Math.round(buffer/50)),max:10,reason:`You finished with ${money(buffer)}.`}
 ];
 const weakest=[...b].sort((a,b)=>a.points/a.max-b.points/b.max);
 const advice:Record<string,string>={'Essentials covered':'Keep essentials covered before trimming costs.','Protected savings kept':'Protect a small amount when salary arrives.','Emergency preparedness':'Build a buffer for the next repair or medical bill.','Restraint on nonessential spending':'Pause before a nonessential purchase.','End balance':'Check the remaining days before committing money.'};
 const total=b.reduce((n,line)=>n+line.points,0);
 const personality=buffer<100?{name:'The Last-Minute Scraper',text:'You reached Day 30 with very little buffer. A small protected amount could give the next month more room.'}:wants>200?{name:'The Social Spender',text:'You made room for things you wanted. Checking the remaining days before spending could help protect essentials.'}:s.savings>=300?{name:'The Safety Net Builder',text:'You kept a meaningful amount protected. The cash left for daily needs still matters.'}:{name:'The Careful Balancer',text:'You balanced the month across needs and wants. Your remaining buffer shows where those choices led.'};
 return {score:total,breakdown:b,endBalance:s.cash,savings:s.savings,essentialsCoveredPct:s.essentials,emergencyPreparedness:buffer>=180?'High':buffer>=90?'Moderate':'Low',personality,nextSteps:weakest.slice(0,3).map(x=>advice[x.label])};
}

return {EVENTS,eligibleEvents,money,affordable,replay,setSplit,complete,timeline,editedHistory,rewindPreview,score};
}
export const {EVENTS,eligibleEvents,money,affordable,replay,setSplit,complete,timeline,editedHistory,rewindPreview,score}=createGameEngine();

export type Choice={id:string;label:string;detail:string;cashChange:number;savingsChange:number;essentialsChange:number;tags?:('essential'|'nonessential'|'savings'|'emergency')[]};
export type GameEvent={id:string;day:number;title:string;description:string;choices:Choice[];condition?:{eventId:string;minSpend?:number;choiceId?:string}};
export type Decision={eventId:string;choiceId:string;fundedFrom?:'cash'|'savings'};
export type Point={day:number;cash:number;savings:number};
export type GameState={day:number;cash:number;savings:number;commitments:number;essentials:number;dailyBaseline:number;history:Decision[];currentEvent:GameEvent|null;finished:boolean};
export type RewindResult={original:Point[];alternative:Point[];originalEnd:number;alternativeEnd:number;insight:string};
export type Report={score:number;breakdown:{label:string;points:number;max:number;reason:string}[];endBalance:number;savings:number;essentialsCoveredPct:number;emergencyPreparedness:'Low'|'Moderate'|'High';personality:{name:string;text:string};nextSteps:string[]};
const c=(id:string,label:string,detail:string,cashChange:number,essentialsChange=0,tags:Choice['tags']=[])=>({id,label,detail,cashChange,savingsChange:0,essentialsChange,tags});
export const EVENTS:GameEvent[]=[
 {id:'groceries',day:3,title:'Groceries',description:'The kitchen is running low. Choose what fits the month.',choices:[c('basic','Basic groceries','Enough for the week.',-60,0,['essential']),c('stock','Stock up','A fuller shop with less pressure later.',-110,0,['essential']),c('minimal','Minimal shop','Spend less, but essentials take a hit.',-30,-10,['essential'])]},
 {id:'friends',day:5,title:"Friends' gathering",description:'Your friends are meeting tonight. It is okay to choose your budget.',choices:[c('skip','Skip','Keep the money for later.',0,0,['savings']),c('cheap','Cheap hangout','Join without making it a big night.',-60,0,['nonessential']),c('big','Big night','A memorable evening.',-200,0,['nonessential'])]},
 {id:'phone',day:8,title:'Phone damage',description:'Your phone needs attention before it becomes harder to use.',choices:[c('full','Full repair','Back to normal.',-180,0,['essential']),c('cheap-repair','Cheaper repair','Good enough for now.',-90,0,['essential']),c('live','Live with it','Keep using it, with some friction.',0,-10,['essential'])]},
 {id:'flash',day:12,title:'Flash sale',description:'The headphones are discounted for one day.',choices:[c('buy','Buy headphones','A want, not a need.',-250,0,['nonessential']),c('skip','Skip','Keep your options open.',0,0,['savings'])]},
 {id:'family',day:16,title:'Family needs help',description:'There is a request for support. Give what you can.',choices:[c('none','Cannot help this time','Protect the rest of the month.',0,0,['savings']),c('some','Help with RM100','A useful contribution.',-100,0,['essential']),c('more','Help with RM200','Make a bigger contribution.',-200,0,['essential'])]},
 {id:'repair',day:18,title:'Repair bill',description:'A repair bill arrives because the gathering became an expensive night.',condition:{eventId:'friends',minSpend:150},choices:[c('pay','Pay it','Close the bill now.',-180,0,['emergency']),c('fix','Cheaper fix','Reduce the cost, but essentials suffer.',-100,-5,['emergency']),c('postpone','Postpone','Keep cash today, accept more risk.',0,-15,['emergency'])]},
 {id:'transport',day:20,title:'Transport problem',description:'Your usual route is unavailable today.',choices:[c('taxi','Taxi','The quickest option.',-80,0,['essential']),c('carpool','Carpool','Share the ride.',-40,0,['essential']),c('bus','Bus','Take the longer route.',-25,0,['essential'])]},
 {id:'subscription',day:24,title:'Subscription renewal',description:'Several subscriptions are due.',choices:[c('both','Keep both','No changes for now.',-45,0,['nonessential']),c('one','Cancel one','Keep the more useful one.',-25,0,['nonessential']),c('all','Cancel all','A clean pause.',0,0,['savings'])]},
 {id:'medical',day:27,title:'Medical expense',description:'You need care. Choose the route that fits your balance.',choices:[c('private','Private clinic','The most convenient option.',-150,0,['essential']),c('government','Government clinic','Lower cost, more waiting.',-30,0,['essential']),c('skip','Skip','Save cash, but essentials suffer.',0,-25,['essential'])]},
];
const spend=(d:Decision,ev:GameEvent)=>Math.max(0,-(ev.choices.find(x=>x.id===d.choiceId)?.cashChange||0));
function exists(ev:GameEvent,h:Decision[]){if(!ev.condition)return true;const d=h.find(x=>x.eventId===ev.condition!.eventId);const parent=EVENTS.find(x=>x.id===ev.condition!.eventId);return !!d&&spend(d,parent!)>=(ev.condition.minSpend||0)&&(ev.condition.choiceId?d.choiceId===ev.condition.choiceId:true)}
export const eligibleEvents=(h:Decision[])=>EVENTS.filter(e=>exists(e,h));
export const money=(n:number)=>`${n<0?'−':''}RM${Math.abs(Math.round(n)).toLocaleString('en-MY')}`;
export function affordable(choice:Choice,state:GameState){const cost=-choice.cashChange;return cost<=state.cash||cost<=state.cash+state.savings}
export function replay(history:Decision[],scenario='First Job'):GameState{
 if(scenario!=='First Job')throw new Error('Unknown scenario');
 const split=history.find(d=>d.eventId==='split');const amount=Number(split?.choiceId);
 if(!split||!Number.isInteger(amount)||amount<0||amount>500||amount%10)return {day:1,cash:0,savings:0,commitments:400,essentials:100,dailyBaseline:15,history:[],currentEvent:null,finished:false};
 let cash=1100-amount,savings=amount,essentials=100,day=1;const kept:Decision[]=[{eventId:'split',choiceId:String(amount)}];
 for(const ev of EVENTS){if(!exists(ev,kept))continue;while(day<ev.day){day++;cash=Math.max(0,cash-15);if(cash===0)essentials=Math.max(0,essentials-2)}
 const d=history.find(x=>x.eventId===ev.id);if(!d)return {day,cash,savings,commitments:0,essentials,dailyBaseline:15,history:kept,currentEvent:ev,finished:false};
 const ch=ev.choices.find(x=>x.id===d.choiceId);if(!ch||-ch.cashChange>cash+savings||(-ch.cashChange>cash&&d.fundedFrom!=='savings'))return {day,cash,savings,commitments:0,essentials,dailyBaseline:15,history:kept,currentEvent:ev,finished:false};
 const cost=-ch.cashChange;const fromSavings=d.fundedFrom==='savings'||cost>cash;
 if(fromSavings){const drawn=Math.min(savings,cost);savings-=drawn;cash-=cost-drawn}else cash-=cost;
 essentials=Math.max(0,Math.min(100,essentials+ch.essentialsChange));kept.push({...d,fundedFrom:fromSavings&&cost>0?'savings':'cash'});
 }
 while(day<30){day++;cash=Math.max(0,cash-15);if(cash===0)essentials=Math.max(0,essentials-2)}
 return {day:30,cash,savings,commitments:0,essentials,dailyBaseline:15,history:kept,currentEvent:null,finished:true};
}
export function setSplit(history:Decision[],saved:number):Decision[]{if(!Number.isInteger(saved)||saved<0||saved>500||saved%10)throw new Error('Savings must be RM0 to RM500 in RM10 steps');return [{eventId:'split',choiceId:String(saved)},...history.filter(x=>x.eventId!=='split')]}
// Complete a timeline by reusing valid later decisions, then taking the cheapest affordable choice.
export function complete(history:Decision[]):Decision[]{let h=history.filter(d=>d.eventId==='split');for(let i=0;i<EVENTS.length+1;i++){const s=replay(h);if(s.finished)break;const ev=s.currentEvent;if(!ev)break;const old=history.find(d=>d.eventId===ev.id);const wanted=ev.choices.find(c=>c.id===old?.choiceId&&affordable(c,s));const choice=wanted||[...ev.choices].sort((a,b)=>b.cashChange-a.cashChange).find(c=>affordable(c,s));if(!choice)throw new Error(`No affordable choice on Day ${ev.day}`);h=[...s.history,{eventId:ev.id,choiceId:choice.id,fundedFrom:-choice.cashChange>s.cash?'savings':old?.fundedFrom}]}return replay(h).history}
export function timeline(history:Decision[]):Point[]{const full=complete(history);const savings=Number(full[0].choiceId);let cash=1100-savings,saved=savings;const points:Point[]=[{day:1,cash,savings:saved}];for(let day=2;day<=30;day++){cash=Math.max(0,cash-15);for(const ev of EVENTS.filter(e=>e.day===day&&exists(e,full))){const d=full.find(x=>x.eventId===ev.id)!;const ch=ev.choices.find(x=>x.id===d.choiceId)!;const cost=-ch.cashChange;if(d.fundedFrom==='savings'||cost>cash){const draw=Math.min(saved,cost);saved-=draw;cash=Math.max(0,cash-(cost-draw))}else cash-=cost}points.push({day,cash,savings:saved})}return points}
export function editedHistory(history:Decision[],eventId:string,newChoiceId:string):Decision[]{if(eventId==='split')return complete(setSplit(history,Number(newChoiceId)));const changed=history.map(d=>d.eventId===eventId?{...d,choiceId:newChoiceId,fundedFrom:undefined}:d);if(!history.some(d=>d.eventId===eventId))throw new Error('Decision not found');return complete(changed)}
export function rewindPreview(history:Decision[],eventId:string,newChoiceId:string):RewindResult{const o=timeline(history),a=timeline(editedHistory(history,eventId,newChoiceId));const oldEnd=o[29].cash+o[29].savings,newEnd=a[29].cash+a[29].savings;const changed=eventId==='split'?1:EVENTS.find(e=>e.id===eventId)?.day||1;const conditional=eligibleEvents(editedHistory(history,eventId,newChoiceId)).some(e=>e.id==='repair')!==eligibleEvents(history).some(e=>e.id==='repair');return {original:o,alternative:a,originalEnd:oldEnd,alternativeEnd:newEnd,insight:`Day ${changed}: the alternative ends at ${money(newEnd)} instead of ${money(oldEnd)}.${conditional?' The Day 18 repair bill changes too.':''}`}}
export function score(s:GameState):Report{
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

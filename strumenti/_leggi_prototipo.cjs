const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(process.argv[2],'utf8').split('\n');
const find=s=>src.findIndex(l=>l.includes(s));
const a=find('============================== DATI'), b=find('let T = 48;');
const c=find('const SUPPORTS = {'), d=find('const SUP_PAIRS');
const e=find('const PROMO = {'), f=find('const promoOf');
const g=find('const MEALS = {'), h=find('let campTab');
const l1=find('const LOOKS = {'), l2=find('function portrait(');
let code=[...src.slice(a,b),...src.slice(c,d+2),...src.slice(e,f),...src.slice(g,h),...src.slice(l1,l2)].join('\n');
code=code.replace('function foe(','function foe_orig(').replace('function mkUnit(','function mkUnit_orig(');
code+=`\nfunction mkUnit(o){return Object.assign({__raw:1},o)}\nfunction foe(cls,lv,x,y,o={}){return Object.assign({__foe:1,__cls:cls,lv,x,y},o)}
;({TER,BEATS,WEAP,ICON,CLASSES,PARTY_BASE,PARTY_ORDER,NPC,CHAPTERS,SUPPORTS,SUP_PAIRS,SUP_NEED,PROMO,MEALS,DIARY,LOOKS,CROWN,CORVO,ROOT,GUARD})`;
module.exports=vm.runInNewContext(code,{console});
if(require.main===module){
 const D=module.exports; const keys={ch:new Set,unit:new Set,goal:new Set,ev:new Set,rew:new Set}; const speakers=new Set; const items=new Set;
 for(const C of D.CHAPTERS){ Object.keys(C).forEach(k=>keys.ch.add(k)); Object.keys(C.goal).forEach(k=>keys.goal.add(k)); Object.keys(C.reward||{}).forEach(k=>keys.rew.add(k));
  const us=[...(C.guests?C.guests():[]),...C.enemies()]; for(const ev of C.events||[]){Object.keys(ev).forEach(k=>keys.ev.add(k)); if(ev.spawn) us.push(...ev.spawn()); (ev.lines||[]).forEach(l=>speakers.add(l[0]));}
  us.forEach(u=>{Object.keys(u).forEach(k=>keys.unit.add(k)); (u.items||[]).forEach(i=>items.add(i.n)); if(u.quote&&!u.id) ; });
  [...C.intro,...C.victory].forEach(l=>{speakers.add(l[0]); if(l.length!==2) console.log('riga strana',C.id,l)});
  (C.reward?.items||[]).forEach(i=>items.add(i[1]));
  console.log(C.id,'|',C.theme,'|',C.goal.type,JSON.stringify({...C.goal,text:undefined}),'| ospiti',C.guests?C.guests().map(u=>u.id+':'+(u.__foe?'foe':'raw')).join(','):'-','| rew',JSON.stringify({...C.reward,text:undefined}), C.route||'', C.pave?'pave':'', C.night?'night':'');
 }
 for(const [k,v] of Object.entries(keys)) console.log(k,[...v].join(' '));
 console.log('speakers',[...speakers].join(' ')); console.log('items',[...items].join(' | '));
 const C12=D.CHAPTERS.find(c=>c.choice); console.log(JSON.stringify(C12.choice,null,1));
 console.log(JSON.stringify(D.CHAPTERS[7].guests(),null,0)); console.log(JSON.stringify(D.CHAPTERS[10].enemies().slice(-2)));
 console.log(Object.keys(D.SUPPORTS), JSON.stringify(D.SUPPORTS[Object.keys(D.SUPPORTS)[0]]).slice(0,300));
 for(const p of Object.values(D.SUPPORTS)) for(const L of Object.values(p)) for(const l of L) speakers.add(l[0]);
}

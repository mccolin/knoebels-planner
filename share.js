import {NUM_RIDES} from './data.js';

export const COMPRESSION_FORMAT='deflate-raw';
export const PLAN_HASH_KEY='plan';
export const SAVE_FILENAME='knoebels-plan.json';

const TIER_ENC={must:'0',want:'1',maybe:'2',nope:'3'};
const TIER_DEC={'0':'must','1':'want','2':'maybe','3':'nope'};

function uid(){return"p"+Math.random().toString(36).slice(2,8);}

export function buildCompact(data){
  return{
    version:2,
    persons:data.persons.map(p=>p.name),
    rides:data.persons.map(p=>{
      const r=data.ratings[p.id]||{};
      let s='';
      for(let i=0;i<NUM_RIDES;i++)s+=r[i]?(TIER_ENC[r[i]]||'.'):'.' ;
      return s;
    }),
    attractions:data.persons.map(p=>{
      const r=data.attractionRatings[p.id]||{};
      return Object.keys(r).filter(k=>r[k]).map(Number).sort((a,b)=>a-b);
    }),
    games:data.persons.map(p=>{
      const r=data.gameRatings[p.id]||{};
      return Object.keys(r).filter(k=>r[k]).map(Number).sort((a,b)=>a-b);
    }),
    config:data.config
  };
}

export function expandCompact(compact){
  const persons=compact.persons.map(name=>({name,id:uid()}));
  const ratings={},attractionRatings={},gameRatings={};
  persons.forEach((p,i)=>{
    ratings[p.id]={};
    const s=compact.rides[i]||'';
    for(let j=0;j<s.length;j++){const c=s[j];if(c!=='.')ratings[p.id][j]=TIER_DEC[c];}
    attractionRatings[p.id]={};
    (compact.attractions[i]||[]).forEach(idx=>{attractionRatings[p.id][idx]=true;});
    gameRatings[p.id]={};
    (compact.games[i]||[]).forEach(idx=>{gameRatings[p.id][idx]=true;});
  });
  return{version:2,persons,ratings,attractionRatings,gameRatings,config:compact.config};
}

export async function planToB64(data){
  const bytes=new TextEncoder().encode(JSON.stringify(buildCompact(data)));
  const cs=new CompressionStream(COMPRESSION_FORMAT);
  const writer=cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf=await new Response(cs.readable).arrayBuffer();
  const u8=new Uint8Array(buf);
  let bin='';
  for(let i=0;i<u8.length;i++)bin+=String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

export async function planFromB64(b64){
  const pad=b64+'==='.slice((b64.length+3)%4);
  const bin=atob(pad.replace(/-/g,'+').replace(/_/g,'/'));
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  let json;
  try{
    const ds=new DecompressionStream(COMPRESSION_FORMAT);
    const writer=ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    json=new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
  }catch(_){
    json=new TextDecoder().decode(bytes); // old uncompressed format
  }
  const data=JSON.parse(json);
  return data.version===2?expandCompact(data):data;
}

// state = {persons,ratings,attractionRatings,gameRatings,mustMult,wantMult,maybePct,gameMult}
export async function sharePlan(btn,state){
  const {persons,ratings,attractionRatings,gameRatings,mustMult,wantMult,maybePct,gameMult}=state;
  const data={version:1,persons,ratings,attractionRatings,gameRatings,config:{mustMult,wantMult,maybePct,gameMult}};
  const encoded=await planToB64(data);
  const url=location.href.split('#')[0]+'#'+PLAN_HASH_KEY+'='+encoded;
  history.replaceState(null,'',url);
  navigator.clipboard.writeText(url).then(()=>{
    const orig=btn.textContent;
    btn.textContent='Copied!';
    setTimeout(()=>btn.textContent=orig,2000);
  }).catch(()=>prompt('Copy this link to share your plan:',url));
}

export function savePlan(state){
  const {persons,ratings,attractionRatings,gameRatings,mustMult,wantMult,maybePct,gameMult}=state;
  const data={version:1,persons,ratings,attractionRatings,gameRatings,config:{mustMult,wantMult,maybePct,gameMult}};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=SAVE_FILENAME;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// applyState(parsedData) is called on successful parse; caller owns state mutation + re-render
export function loadPlan(event,applyState){
  const file=event.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=JSON.parse(e.target.result);
      if(!Array.isArray(data.persons)||!data.ratings)throw new Error();
      applyState(data);
    }catch(err){
      alert('Could not load plan — make sure the file is a valid Knoebels plan export.');
    }
  };
  reader.readAsText(file);
  event.target.value='';
}

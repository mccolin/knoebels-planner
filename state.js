import {RIDES,ATTRACTIONS,GAMES,RIDE_BOOK_DENOMS,GAME_BOOK_COST,GAME_BOOK_VALUE} from './data.js';

export const DEFAULT_MUST_MULT=2;
export const DEFAULT_WANT_MULT=1;
export const DEFAULT_MAYBE_PCT=50;
export const DEFAULT_GAME_MULT=2;

export let persons=[{name:"Me",id:"p0"}];
export let ratings={"p0":{}};
export let attractionRatings={"p0":{}};
export let gameRatings={"p0":{}};
export let activePerson="p0";
export let activeCat="all";
export let activeTierFilter="all";
export let activeSort="name";
export let activeAttrSort="name";
export let activeGameSort="name";
export let mustMult=DEFAULT_MUST_MULT;
export let wantMult=DEFAULT_WANT_MULT;
export let maybePct=DEFAULT_MAYBE_PCT;
export let gameMult=DEFAULT_GAME_MULT;
export let currentView="party";

export function setPersons(arr){persons=arr;}
export function setRatings(obj){ratings=obj;}
export function setAttractionRatings(obj){attractionRatings=obj;}
export function setGameRatings(obj){gameRatings=obj;}
export function setActivePerson(id){activePerson=id;}
export function setActiveCat(c){activeCat=c;}
export function setActiveTierFilter(t){activeTierFilter=t;}
export function setActiveSort(s){activeSort=s;}
export function setActiveAttrSort(s){activeAttrSort=s;}
export function setActiveGameSort(s){activeGameSort=s;}
export function setMustMult(v){mustMult=v;}
export function setWantMult(v){wantMult=v;}
export function setMaybePct(v){maybePct=v;}
export function setGameMult(v){gameMult=v;}
export function setCurrentView(v){currentView=v;}

export function uid(){return"p"+Math.random().toString(36).slice(2,8);}
export function rideSlug(name){return name.toLowerCase().replace(/\'|&/,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
export function initials(n){return n.trim().split(/\s+/).length>1 ? n.trim().split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,2) : n.trim().slice(0,3);}
export function nameColor(n){let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))&0xFFFFFF;return`hsl(${h%360},60%,35%)`;}

export function calcCost(pid,tierMults){
  const r=ratings[pid]||{};
  let total=0,count=0;
  RIDES.forEach((ride,i)=>{
    const t=r[i];
    const mult=t!==undefined?tierMults[t]:undefined;
    if(mult!==undefined){total+=ride.price*mult;count++;}
  });
  return{total,count};
}

export function calcAttractionCost(pid){
  const r=attractionRatings[pid]||{};
  let total=0,count=0,hasVar=false;
  ATTRACTIONS.forEach((a,i)=>{
    if(r[i]){count++;if(a.price>0){total+=a.price;if(a.priceType==="starting_at")hasVar=true;}}
  });
  return{total,count,hasVar};
}

export function calcGameCost(pid){
  const r=gameRatings[pid]||{};
  let total=0,count=0;
  GAMES.forEach((g,i)=>{if(r[i]){total+=g.price*gameMult;count++;}});
  return{total,count};
}

export function recommendBooks(amount){
  if(amount<=0)return{total:0,books:[]};
  const [D500,D200,D100,D50,D20]=RIDE_BOOK_DENOMS;
  if(amount<D20)return{total:amount,books:[],cash:true};
  let best={total:Infinity,count:0,books:[]};
  for(let n500=0;n500<=Math.min(2,Math.ceil(amount/D500));n500++)
    for(let n200=0;n200<=Math.min(4,Math.ceil(amount/D200));n200++)
      for(let n100=0;n100<=Math.min(6,Math.ceil(amount/D100));n100++)
        for(let n50=0;n50<=Math.min(8,Math.ceil(amount/D50));n50++){
          const base=n500*D500+n200*D200+n100*D100+n50*D50;
          if(base>best.total)continue;
          const n20=amount-base>0?Math.ceil((amount-base)/D20):0;
          const total=base+n20*D20;
          if(total<amount)continue;
          const cnt=n500+n200+n100+n50+n20;
          if(total<best.total||(total===best.total&&cnt<best.count)){
            const ns=[n500,n200,n100,n50,n20];
            const books=RIDE_BOOK_DENOMS.map((d,i)=>({d,n:ns[i]})).filter(b=>b.n>0);
            best={total,count:cnt,books};
          }
        }
  return best;
}

export function gameTicketRec(est){
  if(est<=0)return null;
  const full=Math.floor(est/GAME_BOOK_VALUE);
  const remainder=est-full*GAME_BOOK_VALUE;
  const books=full+(remainder>GAME_BOOK_COST?1:0);
  if(books===0)return null;
  const booksCost=books*GAME_BOOK_COST;
  const cashRemainder=Math.max(0,est-books*GAME_BOOK_VALUE);
  const totalCost=booksCost+cashRemainder;
  const savings=est-totalCost;
  return{books,booksCost,cashRemainder,totalCost,savings,value:books*GAME_BOOK_VALUE};
}

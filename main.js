import {ATTRACTIONS} from './data.js';
import {PLAN_HASH_KEY,planFromB64,sharePlan as _sharePlan,savePlan as _savePlan,loadPlan as _loadPlan} from './share.js';
import {persons,ratings,attractionRatings,gameRatings,activePerson,mustMult,wantMult,maybePct,gameMult,currentView,uid,setPersons,setRatings,setAttractionRatings,setGameRatings,setActivePerson as _setActivePerson,setActiveCat,setActiveTierFilter,setActiveSort,setActiveAttrSort,setActiveGameSort,setMustMult,setWantMult,setMaybePct,setGameMult} from './state.js';
import {renderPersonTabs,renderParty,renderRides,renderAttractions,renderGames,renderSummary,showView,rotateIcon} from './render.js';

function addPerson(){
  const inp=document.getElementById("new-person");
  const name=inp.value.trim();
  if(!name)return;
  const id=uid();
  persons.push({name,id});
  ratings[id]={};
  attractionRatings[id]={};
  gameRatings[id]={};
  inp.value="";
  _setActivePerson(id);
  renderPersonTabs();
  renderParty();
  renderRides();
  renderAttractions();
  renderGames();
}

function removePerson(id){
  if(persons.length===1)return;
  setPersons(persons.filter(p=>p.id!==id));
  delete ratings[id];
  delete attractionRatings[id];
  delete gameRatings[id];
  if(activePerson===id)_setActivePerson(persons[0].id);
  renderPersonTabs();
  renderParty();
  renderRides();
  renderAttractions();
  renderGames();
}

function setActivePerson(id){
  _setActivePerson(id);
  renderPersonTabs();
  renderRides();
  renderAttractions();
  renderGames();
}

function setTier(idx,tier){
  if(!ratings[activePerson])ratings[activePerson]={};
  if(ratings[activePerson][idx]===tier)delete ratings[activePerson][idx];
  else ratings[activePerson][idx]=tier;
  renderRides();
}

function setCat(c){
  setActiveCat(c);
  document.querySelectorAll(".fbtn[id^='cat-']").forEach(b=>b.classList.remove("active"));
  document.getElementById("cat-"+(c==="all"?"all":c)).classList.add("active");
  renderRides();
}

function setTierFilter(t){
  setActiveTierFilter(t);
  document.querySelectorAll(".fbtn[id^='tier-']").forEach(b=>b.classList.remove("active"));
  document.getElementById("tier-"+t).classList.add("active");
  renderRides();
}

function setSort(s){
  setActiveSort(s);
  document.querySelectorAll(".fbtn[id^='sort-']").forEach(b=>b.classList.remove("active"));
  document.getElementById("sort-"+s).classList.add("active");
  renderRides();
}

function setAttrSort(s){
  setActiveAttrSort(s);
  document.querySelectorAll(".fbtn[id^='asort-']").forEach(b=>b.classList.remove("active"));
  document.getElementById("asort-"+s).classList.add("active");
  renderAttractions();
}

function toggleAttraction(idx){
  if(!attractionRatings[activePerson])attractionRatings[activePerson]={};
  const wasOn=attractionRatings[activePerson][idx];
  const grp=ATTRACTIONS[idx].group;
  if(grp)ATTRACTIONS.forEach((_,i)=>{if(ATTRACTIONS[i].group===grp)delete attractionRatings[activePerson][i];});
  else if(wasOn)delete attractionRatings[activePerson][idx];
  if(!wasOn)attractionRatings[activePerson][idx]=true;
  if(!wasOn){
    ATTRACTIONS.forEach((a,i)=>{
      if(!a.comboWith||!a.comboResult)return;
      if(!attractionRatings[activePerson][i])return;
      const withIdxs=a.comboWith.map(n=>ATTRACTIONS.findIndex(x=>x.name===n));
      if(withIdxs.some(ci=>!attractionRatings[activePerson][ci]))return;
      const resultIdx=ATTRACTIONS.findIndex(x=>x.name===a.comboResult);
      if(resultIdx===-1)return;
      delete attractionRatings[activePerson][i];
      withIdxs.forEach(ci=>delete attractionRatings[activePerson][ci]);
      attractionRatings[activePerson][resultIdx]=true;
    });
  }
  renderAttractions();
}

function setGameSort(s){
  setActiveGameSort(s);
  document.querySelectorAll(".fbtn[id^='gsort-']").forEach(b=>b.classList.remove("active"));
  document.getElementById("gsort-"+s).classList.add("active");
  renderGames();
}

function toggleGame(idx){
  if(!gameRatings[activePerson])gameRatings[activePerson]={};
  if(gameRatings[activePerson][idx])delete gameRatings[activePerson][idx];
  else gameRatings[activePerson][idx]=true;
  renderGames();
}

function getState(){return{persons,ratings,attractionRatings,gameRatings,mustMult,wantMult,maybePct,gameMult};}
function sharePlan(btn){return _sharePlan(btn,getState());}
function savePlan(){return _savePlan(getState());}
function loadPlan(event){return _loadPlan(event,applyPlanData);}

function applyPlanData(data){
  setPersons(data.persons);
  setRatings(data.ratings);
  setAttractionRatings(data.attractionRatings||{});
  setGameRatings(data.gameRatings||{});
  persons.forEach(p=>{
    if(!attractionRatings[p.id])attractionRatings[p.id]={};
    if(!gameRatings[p.id])gameRatings[p.id]={};
  });
  if(data.config){
    const cfg=data.config;
    if(cfg.mustMult!=null){setMustMult(cfg.mustMult);const el=document.getElementById('cfg-must');if(el)el.value=cfg.mustMult;}
    if(cfg.wantMult!=null){setWantMult(cfg.wantMult);const el=document.getElementById('cfg-want');if(el)el.value=cfg.wantMult;}
    if(cfg.maybePct!=null){setMaybePct(cfg.maybePct);const el=document.getElementById('cfg-maybe');if(el)el.value=cfg.maybePct;}
    if(cfg.gameMult!=null){setGameMult(cfg.gameMult);const el=document.getElementById('cfg-games');if(el)el.value=cfg.gameMult;}
  }
  _setActivePerson(persons[0].id);
  renderPersonTabs();renderRides();renderAttractions();renderGames();
  if(currentView==='party')renderParty();
  if(currentView==='summary')renderSummary();
}

(async function(){
  const m=location.hash.match(new RegExp('^#'+PLAN_HASH_KEY+'=(.+)'));
  if(m){
    try{
      const data=await planFromB64(m[1]);
      if(Array.isArray(data.persons)&&data.ratings)applyPlanData(data);
    }catch(e){}
  }
  document.getElementById('cfg-must').value=mustMult;
  document.getElementById('cfg-want').value=wantMult;
  document.getElementById('cfg-maybe').value=maybePct;
  document.getElementById('cfg-games').value=gameMult;
  renderPersonTabs();
  renderParty();
  renderRides();
  renderAttractions();
  renderGames();
  rotateIcon();
  const tabParam=new URL(location.href).searchParams.get('tab');
  if(['party','rides','attractions','games','summary'].includes(tabParam))showView(tabParam);
})();

Object.assign(window,{showView,addPerson,removePerson,setActivePerson,setTier,setCat,setTierFilter,setSort,setAttrSort,setGameSort,toggleAttraction,toggleGame,sharePlan,savePlan,loadPlan,renderSummary,setMustMult,setWantMult,setMaybePct,setGameMult});

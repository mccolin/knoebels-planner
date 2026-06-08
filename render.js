import {CAT_COLORS,RIDES,ATTRACTIONS,GAMES,TIERS,PASS_PRICE,RIDE_BOOK_DENOMS,GAME_BOOK_COST,GAME_BOOK_VALUE} from './data.js';
import {persons,ratings,attractionRatings,gameRatings,activePerson,activeCat,activeTierFilter,activeSort,activeAttrSort,activeGameSort,mustMult,wantMult,maybePct,gameMult,setCurrentView,calcCost,calcAttractionCost,calcGameCost,recommendBooks,gameTicketRec,initials,nameColor,rideSlug} from './state.js';

function attrPriceLabel(a){
  if(a.priceType==="free")return null;
  return(a.priceType==="starting_at"?"From ":"")+"$"+a.price.toFixed(2);
}

const ICON_NAMES = ["ti-rollercoaster","ti-building-carousel","ti-ticket","ti-list-check","ti-golf","ti-galaxy"];
const ICON_INTERVAL = 3000;
let iconCount = 0;
export function rotateIcon(){
  setInterval(()=>{
    let icon = document.getElementsByClassName('ti')[0];
    if (icon) {
      icon.classList.remove(...ICON_NAMES);
      icon.classList.add(ICON_NAMES[++iconCount % ICON_NAMES.length]);
    }
  }, ICON_INTERVAL);
}

export function renderParty(){
  const elPartyCount=document.getElementById("party-size");
  if(elPartyCount)elPartyCount.innerHTML=`<div class="section-label">${persons?`${persons.length} ${persons.length!==1?'people':'person'} in party`:''}</div>`
  
  const elParty=document.getElementById("party-content");
  if(!elParty)return;
  elParty.innerHTML=persons.map(p=>{
    const r=ratings[p.id]||{};
    const mustRides=Object.entries(r).filter(([key])=>r[key]==="must").map(([key])=>RIDES[key].name);
    const wantRides=Object.entries(r).filter(([key])=>r[key]==="want").map(([key])=>RIDES[key].name);
    const mustCount=mustRides.length;
    const wantCount=wantRides.length;
    const rideCount=mustCount+wantCount;
    const attrCount=Object.keys(attractionRatings[p.id]||{}).filter(k=>(attractionRatings[p.id]||{})[k]).length;
    const gameCount=Object.keys(gameRatings[p.id]||{}).filter(k=>(gameRatings[p.id]||{})[k]).length;
    const est=calcCost(p.id,{must:mustMult,want:wantMult,maybe:maybePct/100}).total;
    let recHTML='';
    if(est>0){
      if(est>PASS_PRICE){
        recHTML=`<span class="rec-badge rec-badge-pass">Pass · $${PASS_PRICE.toFixed(2)}</span>`;
      } else {
        const bk=recommendBooks(est);
        if(bk.cash){
          recHTML=`<span class="rec-badge rec-badge-books">Cash · $${est.toFixed(2)}</span>`;
        } else {
          const bkStr=bk.books.map(b=>b.n>1?`${b.n}×$${b.d}`:`$${b.d}`).join('+');
          recHTML=`<span class="rec-badge rec-badge-books">Books · ${bkStr}</span>`;
        }
      }
    }
    return `<div class="party-card">
      <div class="party-card-head">
        <div class="ps-avatar" style="--person-color:${nameColor(p.name)}">${initials(p.name)}</div>
        <div class="party-card-name">${p.name}</div>
        ${persons.length>1?`<button class="party-remove" onclick="removePerson('${p.id}')">&times;</button>`:''}
      </div>
      <div class="party-stats">
        <span class="party-stat"><strong>${rideCount}</strong> ride${rideCount!==1?'s':''}</span>
        <span class="party-stat"><strong>${attrCount}</strong> attraction${attrCount!==1?'s':''}</span>
        <span class="party-stat"><strong>${gameCount}</strong> game${gameCount!==1?'s':''}</span>
      </div>
      <div class="party-cost">${est>0?`<span class="party-est">~$${est.toFixed(2)}</span>${recHTML}`:'<span class="party-no-rides">No rides rated</span>'}</div>
    </div>`;
  }).join('');

  const elRideReport=document.getElementById("ride-report");
  if(elRideReport)elRideReport.innerHTML=renderRideReportHTML();
}

export function showView(v){
  setCurrentView(v);
  document.getElementById("view-party").style.display=v==="party"?"block":"none";
  document.getElementById("view-rides").style.display=v==="rides"?"block":"none";
  document.getElementById("view-attractions").style.display=v==="attractions"?"block":"none";
  document.getElementById("view-games").style.display=v==="games"?"block":"none";
  document.getElementById("view-summary").style.display=v==="summary"?"block":"none";
  document.getElementById("tab-party").classList.toggle("active",v==="party");
  document.getElementById("tab-rides").classList.toggle("active",v==="rides");
  document.getElementById("tab-attractions").classList.toggle("active",v==="attractions");
  document.getElementById("tab-games").classList.toggle("active",v==="games");
  document.getElementById("tab-summary").classList.toggle("active",v==="summary");
  if(v==="party")renderParty();
  if(v==="summary")renderSummary();
  if(v==="attractions")renderAttractions();
  if(v==="games")renderGames();
}

export function renderPersonTabs(){
  const tabsHTML=persons.map(p=>`
    <button class="ptab${p.id===activePerson?" active":""}" style="--person-color:${nameColor(p.name)}" onclick="setActivePerson('${p.id}')">
      ${initials(p.name)} ${p.name}
      ${persons.length>1?`<span class="ptab-x" onclick="event.stopPropagation();removePerson('${p.id}')">&times;</span>`:""}
    </button>`).join("")+
    `<button class="ptab" onclick="document.getElementById('new-person').focus()" style="color:var(--k-sage);"><i class="ti ti-plus" aria-hidden="true"></i></button>`;
  ["person-tabs","person-tabs-attr","person-tabs-games"].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.innerHTML=tabsHTML;
  });
}

export function renderRides(){
  const r=ratings[activePerson]||{};
  const filtered=RIDES.map((ride,i)=>({ride,i,tier:r[i]})).filter(({ride,tier})=>{
    const catOk=activeCat==="all"||ride.cat===activeCat;
    const tierOk=activeTierFilter==="all"||(activeTierFilter==="unset"?!tier:tier===activeTierFilter);
    return catOk&&tierOk;
  }).sort((a,b)=>{
    if(activeSort==="price-asc") return a.ride.price-b.ride.price;
    if(activeSort==="price-desc") return b.ride.price-a.ride.price;
    if(activeSort==="wanted"){
      const TIER_SCORE={must:3,want:2,maybe:1,nope:0};
      const score=({i})=>persons.reduce((s,p)=>s+(TIER_SCORE[(ratings[p.id]||{})[i]]||0),0);
      return score(b)-score(a)||a.ride.name.localeCompare(b.ride.name);
    }
    return a.ride.name.localeCompare(b.ride.name);
  });
  const c=document.getElementById("rides-list");
  if(!filtered.length){c.innerHTML=`<div class="empty">No rides match these filters.</div>`;return;}
  c.innerHTML=filtered.map(({ride,i,tier})=>`
    <div class="ride-row">
      <span class="ride-cat-dot" style="background:${CAT_COLORS[ride.cat]||"#8B9E7A"};" title="${ride.cat}"></span>
      <span class="ride-name">${ride.name}</span>
      <a class="ride-info" href="https://knoebels.com/ride/${rideSlug(ride.name)}/" target="_blank" rel="noopener">Info ↗</a>
      <span class="ride-price">$${ride.price.toFixed(2)}</span>
      <div class="tier-btns">
        ${TIERS.map(t=>`<button class="tbtn${tier===t?" t-"+t:""}" onclick="setTier(${i},'${t}')">${t==="must"?"&#10003; Must":t==="want"?"Want":t==="maybe"?"Maybe":"Nope"}</button>`).join("")}
      </div>
    </div>`).join("");
}

export function renderAttractions(){
  const el=document.getElementById("attractions-list");
  if(!el)return;
  const r=attractionRatings[activePerson]||{};
  const includedNames=new Set();
  ATTRACTIONS.forEach((a,i)=>{
    if(!r[i])return;
    ATTRACTIONS.forEach(b=>{
      if(b.comboResult===a.name){
        includedNames.add(b.name);
        (b.comboWith||[]).forEach(n=>includedNames.add(n));
      }
    });
  });
  const items=ATTRACTIONS.map((a,i)=>({a,i})).sort((x,y)=>{
    if(activeAttrSort==="price-asc")return x.a.price-y.a.price;
    if(activeAttrSort==="price-desc")return y.a.price-x.a.price;
    if(activeAttrSort==="interested"){
      const interest=({i})=>persons.filter(p=>(attractionRatings[p.id]||{})[i]).length;
      return interest(y)-interest(x)||x.a.name.localeCompare(y.a.name);
    }
    return x.a.name.localeCompare(y.a.name);
  });
  el.innerHTML=items.map(({a,i})=>{
    const lbl=attrPriceLabel(a);
    const incl=includedNames.has(a.name);
    const btnClass="attr-toggle"+(r[i]?" active":incl?" included":"");
    const btnText=r[i]?"✓ Interested":incl?"Included":"Interested?";
    return`<div class="attr-row">
      <span class="attr-name">${a.name}</span>
      ${lbl?`<span class="attr-price">${lbl}</span>`:'<span class="attr-free">Free</span>'}
      <button class="${btnClass}" onclick="toggleAttraction(${i})">${btnText}</button>
    </div>`;
  }).join("");
}

export function renderGames(){
  const el=document.getElementById("games-list");
  if(!el)return;
  const r=gameRatings[activePerson]||{};
  const items=GAMES.map((g,i)=>({g,i})).sort((x,y)=>{
    if(activeGameSort==="price-asc")return x.g.price-y.g.price;
    if(activeGameSort==="price-desc")return y.g.price-x.g.price;
    if(activeGameSort==="interested"){
      const interest=({i})=>persons.filter(p=>(gameRatings[p.id]||{})[i]).length;
      return interest(y)-interest(x)||x.g.name.localeCompare(y.g.name);
    }
    return x.g.name.localeCompare(y.g.name);
  });
  el.innerHTML=items.map(({g,i})=>`
    <div class="attr-row">
      <span class="attr-name">${g.name}</span>
      ${g.winnerEveryTime?'<span class="game-win">Prize!</span>':""}
      <span class="attr-price">$${g.price.toFixed(2)}</span>
      <span class="game-unit">${g.unit}</span>
      <button class="attr-toggle${r[i]?" active":""}" onclick="toggleGame(${i})">${r[i]?"✓ Interested":"Interested?"}</button>
    </div>`).join("");
}

export function renderRideReportHTML(){
  if(persons.length<2)return'';
  const rows=[];
  RIDES.forEach((ride,i)=>{
    const pr=persons.map(p=>(ratings[p.id]||{})[i]);
    const mwc=pr.filter(r=>r==='must'||r==='want').length;
    if(mwc<=persons.length/2)return;
    const score=pr.filter(r=>r==='must').length*2+pr.filter(r=>r==='want').length;
    rows.push({ride,pr,mwc,score,allIn:pr.every(r=>r==='must'||r==='want')});
  });
  if(!rows.length)return'';
  rows.sort((a,b)=>b.score-a.score||a.ride.name.localeCompare(b.ride.name));
  const allInCount=rows.filter(r=>r.allIn).length;
  const TCLS={must:'ot-must',want:'ot-want',maybe:'ot-maybe',nope:'ot-nope'};
  const TABBR={must:'Must',want:'Want',maybe:'Maybe',nope:'Nope'};
  let h=`<div class="section-label">` +
    `Ride report${allInCount?` · ${allInCount} ride${allInCount!==1?'s':''} everyone wants`:''}` +
    `${rows.length>0 ? ` · ${rows.length} ride${rows.length!==1?'s':''} most want`:''}` +
    `</div>`;
  h+='<div class="ride-report-wrap"><table class="ride-report-table"><thead><tr><th class="ot-ride-h">Ride</th>';
  persons.forEach(p=>{h+=`<th title="${p.name}">${p.name.split(' ')[0].slice(0,8)}</th>`;});
  h+='</tr></thead><tbody>';
  rows.forEach(({ride,pr,allIn})=>{
    h+=`<tr${allIn?' class="ot-all"':''}><td class="ot-ride">${ride.name}</td>`;
    pr.forEach(t=>{h+=t?`<td><span class="ot-tier ${TCLS[t]}">${TABBR[t]}</span></td>`:'<td></td>';});
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  return h;
}

export function renderSummary(){
  const c=document.getElementById("summary-content");
  let html="";
  if(persons.length>1){
    const gMust=persons.reduce((s,p)=>s+calcCost(p.id,{must:mustMult}).total,0);
    const gMustWant=persons.reduce((s,p)=>s+calcCost(p.id,{must:mustMult,want:wantMult}).total,0);
    const gAll=persons.reduce((s,p)=>s+calcCost(p.id,{must:mustMult,want:wantMult,maybe:maybePct/100}).total,0);
    html+=`<div class="section-label">Group total</div>
    <div class="metric-grid">
      <div class="metric"><div class="metric-label">Must-dos only</div><div class="metric-value">$${gMust.toFixed(2)}</div></div>
      <div class="metric"><div class="metric-label">Must + Want</div><div class="metric-value">$${gMustWant.toFixed(2)}</div></div>
      <div class="metric"><div class="metric-label">If maybes too</div><div class="metric-value">$${gAll.toFixed(2)}</div></div>
    </div>`;
    const gac=persons.map(p=>calcAttractionCost(p.id));
    const gAttrTotal=gac.reduce((s,a)=>s+a.total,0);
    const gAttrCount=gac.reduce((s,a)=>s+a.count,0);
    const gAttrHasVar=gac.some(a=>a.hasVar);
    let gAttrMetricHtml='';
    if (gAttrCount>0) gAttrMetricHtml=`<div class="metric"><div class="metric-label">Attractions (cash)</div><div class="metric-value">$${gAttrTotal.toFixed(2)}${gAttrHasVar?"+":""}</div><div class="metric-sub">${gAttrCount} selected across group</div></div>`;
    const ggc=persons.map(p=>calcGameCost(p.id));
    const gGamesTotal=ggc.reduce((s,g)=>s+g.total,0);
    const gGamesCount=ggc.reduce((s,g)=>s+g.count,0);
    let gGamesMetricHtml='';
    if (gGamesCount>0) gGamesMetricHtml=`<div class="metric"><div class="metric-label">Games (cash)</div><div class="metric-value">$${gGamesTotal.toFixed(2)}</div><div class="metric-sub">${gGamesCount} selected across group</div></div>`;
    if (gAttrCount>0 || gGamesCount>0) {
      let gComboMetricHtml='';
      if (gAttrCount>0 && gGamesCount>0) gComboMetricHtml=`<div class="metric"><div class="metric-label">Combined (cash)</div><div class="metric-value">$${(gAttrTotal+gGamesTotal).toFixed(2)}</div><div class="metric-sub">${gAttrCount+gGamesCount} attractions + games total</div></div>`;
      html+=`<div class="metric-grid" style="margin-bottom:1rem;">${gAttrMetricHtml}${gGamesMetricHtml}${gComboMetricHtml}</div>`;
    }
  }

  // -- Individual ride, attraction, and game summaries
  html+=`<div class="section-label">Individual summaries</div>`;
  const personData=[];
  persons.forEach(p=>{
    const r=ratings[p.id]||{};
    const must=calcCost(p.id,{must:mustMult});
    const mustWant=calcCost(p.id,{must:mustMult,want:wantMult});
    const all3=calcCost(p.id,{must:mustMult,want:wantMult,maybe:maybePct/100});
    personData.push({p,all3});
    const ac=calcAttractionCost(p.id);
    const ra=attractionRatings[p.id]||{};
    const attrNames=ATTRACTIONS.map((a,i)=>ra[i]?a.name:null).filter(Boolean);
    const gc=calcGameCost(p.id);
    const rg=gameRatings[p.id]||{};
    const gameNames=GAMES.map((g,i)=>rg[i]?g.name:null).filter(Boolean);
    const tally={must:0,want:0,maybe:0,nope:0};
    RIDES.forEach((_,i)=>{const t=r[i];if(t)tally[t]++;});
    html+=`<div class="person-summary">
      <div class="ps-head">
        <div class="ps-avatar" style="--person-color:${nameColor(p.name)}">${initials(p.name)}</div>
        <div>
          <div class="ps-name">${p.name}</div>
          <div class="dot-row">
            <span class="dot-item"><span class="di-dot" style="background:#274D3A;"></span>${tally.must} must</span>
            <span class="dot-item"><span class="di-dot" style="background:#C4952A;"></span>${tally.want} want</span>
            <span class="dot-item"><span class="di-dot" style="background:#8B9E7A;"></span>${tally.maybe} maybe</span>
            <span class="dot-item"><span class="di-dot" style="background:#7B2D2D;"></span>${tally.nope} nope</span>
          </div>
        </div>
      </div>
      <div class="metric-grid">
        <div class="metric"><div class="metric-label">Must-dos only</div><div class="metric-value">$${must.total.toFixed(2)}</div><div class="metric-sub">${must.count} ride${must.count!==1?"s":""}</div></div>
        <div class="metric"><div class="metric-label">Must + Want</div><div class="metric-value">$${mustWant.total.toFixed(2)}</div><div class="metric-sub">${mustWant.count} ride${mustWant.count!==1?"s":""}</div></div>
        <div class="metric"><div class="metric-label">If maybes too</div><div class="metric-value">$${all3.total.toFixed(2)}</div><div class="metric-sub">${all3.count} ride${all3.count!==1?"s":""}</div></div>
      </div>
      ${attrNames.length?`<div class="attr-summary"><div class="attr-summary-head"><span class="attr-summary-label">Attractions (cash)</span><span class="attr-summary-total">$${ac.total.toFixed(2)}${ac.hasVar?"+":""}</span></div><div class="attr-summary-items">${attrNames.join(" · ")}</div></div>`:""}
      ${gameNames.length?`<div class="attr-summary"><div class="attr-summary-head"><span class="attr-summary-label">Games (cash)</span><span class="attr-summary-total">$${gc.total.toFixed(2)}</span></div><div class="attr-summary-items">${gameNames.join(" · ")}</div></div>`:""}
    </div>`;
  });
  html+='</div>';
  
  // -- Ticket recommendations 
  const ratedPeople=personData.filter(({all3})=>all3.total>0);
  if(ratedPeople.length>0){
    html+=`<div class="section-label">Ticket recommendation</div>`;
    ratedPeople.forEach(({p,all3})=>{
      const est=all3.total;
      const av=initials(p.name);
      if(est>PASS_PRICE){
        const savings=est-PASS_PRICE;
        html+=`<div class="rec-card">
          <div class="ps-avatar" style="--person-color:${nameColor(p.name)}">${av}</div>
          <div class="rec-body">
            <div class="rec-top"><span class="rec-badge rec-badge-pass">Ride All Day pass</span><span class="rec-price">$${PASS_PRICE.toFixed(2)}</span><span class="rec-savings">saves $${savings.toFixed(2)} vs ticket books</span></div>
            <div class="rec-note">Est. $${est.toFixed(2)} in tickets at current assumptions</div>
          </div>
        </div>`;
      } else {
        const bk=recommendBooks(est);
        const savings=PASS_PRICE-bk.total;
        if(bk.cash){
          html+=`<div class="rec-card">
            <div class="ps-avatar" style="--person-color:${nameColor(p.name)}">${av}</div>
            <div class="rec-body">
              <div class="rec-top"><span class="rec-badge rec-badge-books">Pay cash</span><span class="rec-price">$${est.toFixed(2)}</span><span class="rec-savings">saves $${savings.toFixed(2)} vs pass</span></div>
              <div class="rec-note">Est. under $${RIDE_BOOK_DENOMS[RIDE_BOOK_DENOMS.length-1]} — no book needed</div>
            </div>
          </div>`;
        } else {
          const bkStr=bk.books.map(b=>b.n>1?`${b.n}×$${b.d}`:`$${b.d}`).join(' + ');
          html+=`<div class="rec-card">
            <div class="ps-avatar" style="--person-color:${nameColor(p.name)}">${av}</div>
            <div class="rec-body">
              <div class="rec-top"><span class="rec-badge rec-badge-books">Ticket books</span><span class="rec-price">$${bk.total.toFixed(2)}</span><span class="rec-savings">saves $${savings.toFixed(2)} vs pass</span></div>
              <div class="rec-note">Est. $${est.toFixed(2)} in tickets · ${bkStr}</div>
            </div>
          </div>`;
        }
      }
    });
    if(ratedPeople.length>1){
      const optTotal=ratedPeople.reduce((s,{all3})=>s+(all3.total>PASS_PRICE?PASS_PRICE:recommendBooks(all3.total).total),0);
      const passTotal=ratedPeople.length*PASS_PRICE;
      const bkTotal=ratedPeople.reduce((s,{all3})=>s+recommendBooks(all3.total).total,0);
      const best=Math.min(optTotal,passTotal,bkTotal);
      html+=`<div class="section-label">Group comparison</div>
      <div class="metric-grid" style="margin-bottom:1rem;">
        <div class="metric${optTotal===best?' rec-best':''}"><div class="metric-label">Optimal mix</div><div class="metric-value">$${optTotal.toFixed(2)}</div><div class="metric-sub">per recommendations above</div></div>
        <div class="metric${passTotal===best?' rec-best':''}"><div class="metric-label">All passes</div><div class="metric-value">$${passTotal.toFixed(2)}</div><div class="metric-sub">${ratedPeople.length} × $${PASS_PRICE}</div></div>
        <div class="metric${bkTotal===best?' rec-best':''}"><div class="metric-label">All ticket books</div><div class="metric-value">$${bkTotal.toFixed(2)}</div><div class="metric-sub">min. books to cover est.</div></div>
      </div>`;
    }
    html+=`<div class="tip">Ticket books (${[...RIDE_BOOK_DENOMS].sort((a,b)=>a-b).map(d=>'$'+d).join(', ')}) never expire — any leftover balance carries over to your next visit.</div>`;
  }
  
  // -- Game ticket recommendations
  const gamesPlayers=personData.filter(({p})=>calcGameCost(p.id).total>0);
  if(gamesPlayers.length>0){
    html+=`<div class="section-label">Games ticket recommendation</div>`;
    gamesPlayers.forEach(({p})=>{
      const est=calcGameCost(p.id).total;
      const rec=gameTicketRec(est);
      const av=initials(p.name);
      if(rec&&rec.savings>0){
        html+=`<div class="rec-card">
          <div class="ps-avatar" style="--person-color:${nameColor(p.name)}">${av}</div>
          <div class="rec-body">
            <div class="rec-top"><span class="rec-badge rec-badge-pass">${rec.books} game ticket book${rec.books!==1?"s":""}</span><span class="rec-price">$${rec.totalCost.toFixed(2)}</span><span class="rec-savings">saves $${rec.savings.toFixed(2)} vs cash</span></div>
            <div class="rec-note">Est. $${est.toFixed(2)} in games · ${rec.books}×$${GAME_BOOK_COST} book${rec.books!==1?"s":""}${rec.cashRemainder>0?` + $${rec.cashRemainder.toFixed(2)} cash`:""}</div>
          </div>
        </div>`;
      } else {
        html+=`<div class="rec-card">
          <div class="ps-avatar" style="--person-color:${nameColor(p.name)}">${av}</div>
          <div class="rec-body">
            <div class="rec-top"><span class="rec-badge rec-badge-books">Pay cash</span><span class="rec-price">$${est.toFixed(2)}</span></div>
            <div class="rec-note">Est. spend is below 1 book's value — buying ahead costs more than needed</div>
          </div>
        </div>`;
      }
    });
    if(gamesPlayers.length>1){
      const totalCash=gamesPlayers.reduce((s,{p})=>s+calcGameCost(p.id).total,0);
      const totalBooks=gamesPlayers.reduce((s,{p})=>{
        const est=calcGameCost(p.id).total;const rec=gameTicketRec(est);
        return s+(rec&&rec.savings>0?rec.totalCost:est);
      },0);
      const saves=totalCash-totalBooks;
      if(saves>0)html+=`<div class="metric-grid" style="margin-bottom:1rem;">
        <div class="metric rec-best"><div class="metric-label">Group w/ books</div><div class="metric-value">$${totalBooks.toFixed(2)}</div><div class="metric-sub">saves $${saves.toFixed(2)} vs all cash</div></div>
        <div class="metric"><div class="metric-label">Group cash</div><div class="metric-value">$${totalCash.toFixed(2)}</div></div>
      </div>`;
    }
    html+=`<div class="tip">Game ticket books can be purchased for $${GAME_BOOK_COST} ahead of time, but contain $${GAME_BOOK_VALUE} of value.</div>`;
  }
  
  c.innerHTML=html;
}

(function(){
  let GREEN='#3DFF8A', YELLOW='#FFD84D', RED='#FF3B3B', TEAL='#3EE0D4';
  let TRACK='rgba(139,152,148,.22)', TICK='rgba(243,246,244,.28)';
  const NIGHT_ACC={claude:'#C4B5FD',openai:'#5EEAD4',xai:'#FCA5A5',github:'#93C5FD',cursor:'#A78BFA',cloudflare:'#F97316',notion:'#A3A3A3'};
  const LEO_ACC={claude:'#5B4B9A',openai:'#1A7A6E',xai:'#9A3B3B',github:'#2F5F9A',cursor:'#5A3D9A',cloudflare:'#C45C12',notion:'#4A453F'};
  function themeColors(){
    const t=document.documentElement.getAttribute('data-theme');
    if(t==='leonardo'){
      return {GREEN:'#0D9A4C',YELLOW:'#D48400',RED:'#D32F2F',TEAL:'#1F6F6A',TRACK:'rgba(45,32,20,0.18)',TICK:'rgba(31,24,18,0.45)'};
    }
    return {GREEN:'#3DFF8A',YELLOW:'#FFD84D',RED:'#FF3B3B',TEAL:'#3EE0D4',TRACK:'rgba(139,152,148,.22)',TICK:'rgba(243,246,244,.28)'};
  }
  function refreshThemeConsts(){
    const c=themeColors();
    GREEN=c.GREEN; YELLOW=c.YELLOW; RED=c.RED; TEAL=c.TEAL; TRACK=c.TRACK; TICK=c.TICK;
    const leo=document.documentElement.getAttribute('data-theme')==='leonardo';
    const acc=leo?LEO_ACC:NIGHT_ACC;
    services.forEach(s=>{ if(acc[s.id]) s.color=acc[s.id]; });
  }
  function isLeonardo(){ return document.documentElement.getAttribute('data-theme')==='leonardo'; }
  const HOURS=48;
  const now=()=>Date.now();
  const windowStart=()=>now()-HOURS*3600*1000;
  const reduceMotion=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const services=[
    {id:'claude',name:'CLAUDE',theme:'claude',official:'https://status.claude.com/',summary:'https://status.claude.com/api/v2/summary.json',incidents:'https://status.claude.com/api/v2/incidents.json',kind:'statuspage',color:'#C4B5FD'},
    {id:'openai',name:'OPENAI / CHATGPT',theme:'openai',official:'https://status.openai.com/',summary:'https://status.openai.com/api/v2/summary.json',incidents:'https://status.openai.com/api/v2/incidents.json',kind:'statuspage',color:'#5EEAD4'},
    {id:'xai',name:'xAI / GROK',theme:'xai',official:'https://status.x.ai/',summary:'https://status.x.ai/',incidents:null,kind:'xai-html',color:'#FCA5A5'},
    {id:'github',name:'GITHUB',theme:'github',official:'https://www.githubstatus.com/',summary:'https://www.githubstatus.com/api/v2/summary.json',incidents:'https://www.githubstatus.com/api/v2/incidents.json',kind:'statuspage',color:'#93C5FD'},
    {id:'cursor',name:'CURSOR',theme:'cursor',official:'https://status.cursor.com/',summary:'https://status.cursor.com/api/v2/summary.json',incidents:'https://status.cursor.com/api/v2/incidents.json',kind:'statuspage',color:'#A78BFA'},
    {id:'cloudflare',name:'CLOUDFLARE',theme:'cloudflare',official:'https://www.cloudflarestatus.com/',summary:'https://www.cloudflarestatus.com/api/v2/summary.json',incidents:'https://www.cloudflarestatus.com/api/v2/incidents.json',kind:'statuspage',color:'#F97316'},
    {id:'notion',name:'NOTION',theme:'notion',official:'https://www.notion-status.com/',summary:'https://www.notion-status.com/api/v2/summary.json',incidents:'https://www.notion-status.com/api/v2/incidents.json',kind:'statuspage',color:'#A3A3A3'}
  ];
  const grid=document.getElementById('grid');
  const state={};
  document.documentElement.style.setProperty('--lane-count', String(services.length));
  const pc=document.getElementById('provCount'); if(pc) pc.textContent=String(services.length);

  services.forEach(s=>{
    const el=document.createElement('section');
    el.className='card theme-'+s.theme;
    el.dataset.level='err';
    el.title=s.name;
    el.innerHTML=`<div class="head"><div class="name">${s.name}</div><div class="state pulse" id="${s.id}-state">LOADING</div></div><p class="desc" id="${s.id}-desc">Contacting feed…</p><div class="gauge-wrap"><canvas id="${s.id}-g" width="360" height="220"></canvas></div><div class="comps" id="${s.id}-comps"></div><div class="actions"><a class="btn" href="${s.official}" target="_blank" rel="noopener">OPEN STATUS</a><button class="btn" type="button" data-refresh="${s.id}">REFRESH</button></div>`;
    grid.appendChild(el); state[s.id]={incidents:[]};
  });

  function shortWord(label){
    const L=(label||'').toUpperCase();
    if(L.includes('OPERATIONAL')||L==='OK') return 'OK';
    if(L.includes('DEGRADED')||L==='DEG') return 'DEG';
    if(L.includes('MAJOR')||L==='MAJ') return 'MAJ';
    if(L.includes('CRITICAL')||L==='CRIT') return 'CRIT';
    if(L.includes('INCIDENT')) return 'INC';
    if(L.includes('OUTAGE')) return 'OUT';
    if(L.includes('ERROR')||L==='ERR'||L.includes('UNKNOWN')||L.includes('FEED')) return 'ERR';
    if(L.includes('LOAD')||L==='…') return '…';
    return (L.replace(/[^A-Z]/g,'').slice(0,4)||'—');
  }

  function dataLevelFrom(info){
    const L=(info.label||'').toUpperCase();
    if(info.level>=.92 && (L.includes('OPERATIONAL')||L==='OK')) return 'ok';
    if(L.includes('ERROR')||L.includes('UNKNOWN')||L.includes('FEED')) return 'err';
    if(info.level<=.35 || L.includes('MAJOR')||L.includes('CRITICAL')||L.includes('OUTAGE')) return 'bad';
    if(info.level<.9 || L.includes('DEGRADED')||L.includes('INCIDENT')) return 'warn';
    return 'ok';
  }

  function levelFromIndicator(ind){
    ind=(ind||'none').toLowerCase();
    if(ind==='none'||ind==='operational') return {level:1,label:'OPERATIONAL',color:GREEN};
    if(ind==='minor') return {level:.62,label:'DEGRADED',color:YELLOW};
    if(ind==='major') return {level:.28,label:'MAJOR',color:RED};
    if(ind==='critical') return {level:.08,label:'CRITICAL',color:RED};
    return {level:.4,label:String(ind).toUpperCase(),color:YELLOW};
  }

  function drawMotif(ctx,s){
    ctx.save(); ctx.globalAlpha=.2;
    if(s.theme==='xai'){ for(let i=0;i<12;i++){ ctx.fillStyle='#F3F6F4'; ctx.fillRect((i*53)%120,(i*17)%56,1.5,1.5);} ctx.fillStyle='#FCA5A5'; ctx.beginPath(); ctx.moveTo(36,22); ctx.lineTo(42,36); ctx.lineTo(30,36); ctx.closePath(); ctx.fill(); }
    else if(s.theme==='claude'){ ctx.strokeStyle='#C4B5FD'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(28,30); ctx.quadraticCurveTo(60,8,90,28); ctx.stroke(); }
    else if(s.theme==='openai'){ ctx.strokeStyle='#5EEAD4'; ctx.lineWidth=1; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(42,28,6+i*7,0,Math.PI*2); ctx.stroke(); } }
    else if(s.theme==='cursor'){ ctx.strokeStyle='#A78BFA'; ctx.lineWidth=1.5; ctx.strokeRect(30,16,26,26); ctx.beginPath(); ctx.moveTo(34,42); ctx.lineTo(43,30); ctx.lineTo(52,42); ctx.stroke(); }
    else if(s.theme==='cloudflare'){ ctx.strokeStyle='#F97316'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(28,36); ctx.quadraticCurveTo(48,14,78,34); ctx.stroke(); }
    else if(s.theme==='notion'){ ctx.strokeStyle='#A3A3A3'; ctx.lineWidth=1.5; ctx.strokeRect(34,14,26,32); ctx.beginPath(); ctx.moveTo(40,22); ctx.lineTo(54,22); ctx.moveTo(40,30); ctx.lineTo(54,30); ctx.stroke(); }
    else { for(let i=0;i<8;i++){ const h=6+(i*13)%18; ctx.fillStyle='#93C5FD'; ctx.fillRect(28+i*8,46-h,5,h);} }
    ctx.restore();
  }

  function hatch(ctx,x,y,w,h,step,color){
    ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=1; ctx.beginPath();
    for(let i=-h;i<w+h;i+=step){ ctx.moveTo(x+i,y); ctx.lineTo(x+i+h,y+h); }
    ctx.stroke(); ctx.restore();
  }

  function drawLeonardoGauge(ctx,W,H,info){
    const cx=W/2, cy=H*0.69, r=Math.min(W,H)*0.42;
    const start=Math.PI*1.15, end=Math.PI*-0.15;
    const ang=t=>start+(end-start)*t;
    const level=Math.max(.02,Math.min(1,info.level));
    const CIRCLE='rgba(45,32,20,0.35)';
    // light hatch α≤0.08 — no motifs on Leonardo
    hatch(ctx, cx-r-8, cy-r*0.35, (r+8)*2, r*1.15, 7, 'rgba(45,32,20,0.055)');
    // Vitruvian outer + inner
    ctx.strokeStyle=CIRCLE; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,r+12,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r*0.72,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='rgba(45,32,20,0.12)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-(r+12),cy); ctx.lineTo(cx+(r+12),cy);
    ctx.moveTo(cx,cy-(r+12)); ctx.lineTo(cx,cy+(r+4)); ctx.stroke();
    // segmented status arc — bright ok/warn/bad only
    const segs=22;
    ctx.lineCap='butt';
    for(let i=0;i<segs;i++){
      const t0=i/segs, t1=(i+.72)/segs;
      const lit=t0<level;
      const tip=lit && t0>level-1/segs;
      ctx.beginPath();
      ctx.arc(cx,cy,r,ang(t0),ang(t1),false);
      ctx.strokeStyle=lit?info.color:TRACK;
      ctx.lineWidth=tip?13:11;
      ctx.stroke();
      if(i%4===0){
        const a=ang(t0);
        ctx.strokeStyle=TICK; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*(r+8),cy+Math.sin(a)*(r+8));
        ctx.lineTo(cx+Math.cos(a)*(r+16),cy+Math.sin(a)*(r+16));
        ctx.stroke();
      }
    }
    // needle: sepia shaft + status tip
    const a=ang(level);
    ctx.strokeStyle='#2C2118'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*(r-26),cy+Math.sin(a)*(r-26)); ctx.stroke();
    ctx.fillStyle=info.color;
    ctx.beginPath();
    const tipX=cx+Math.cos(a)*(r-18), tipY=cy+Math.sin(a)*(r-18);
    const px=-Math.sin(a), py=Math.cos(a);
    ctx.moveTo(tipX,tipY);
    ctx.lineTo(tipX-Math.cos(a)*10+px*4, tipY-Math.sin(a)*10+py*4);
    ctx.lineTo(tipX-Math.cos(a)*10-px*4, tipY-Math.sin(a)*10-py*4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#FBF6EA'; ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=TEAL; ctx.lineWidth=1.5; ctx.stroke();
    const short=info.short||shortWord(info.label);
    const ff=getComputedStyle(document.body).fontFamily;
    ctx.fillStyle=info.color; ctx.font='700 20px '+ff; ctx.textAlign='center'; ctx.fillText(short,cx,cy+34);
    ctx.fillStyle='#6B5A48'; ctx.font='10px '+ff; ctx.fillText(Math.round(level*100)+'%',cx,cy+50);
  }

  function drawGauge(canvas,s,info){
    const dpr=Math.min(2,window.devicePixelRatio||1),W=360,H=220;
    canvas.width=W*dpr; canvas.height=H*dpr;
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    if(isLeonardo()){ drawLeonardoGauge(ctx,W,H,info); return; }
    const cx=180,cy=152,r=92;
    const start=Math.PI*1.15, end=Math.PI*-0.15;
    const ang=t=>start+(end-start)*t;
    const level=Math.max(.02,Math.min(1,info.level));
    const segs=22;
    drawMotif(ctx,s);
    ctx.lineCap='butt';
    for(let i=0;i<segs;i++){
      const t0=i/segs, t1=(i+.72)/segs;
      const lit=t0<level;
      const tip=lit && t0>level-1/segs;
      ctx.beginPath();
      ctx.arc(cx,cy,r,ang(t0),ang(t1),false);
      ctx.strokeStyle=lit?info.color:TRACK;
      ctx.lineWidth=tip?13:11;
      if(tip && !reduceMotion()){ ctx.shadowColor=info.color; ctx.shadowBlur=8; }
      ctx.stroke(); ctx.shadowBlur=0;
      if(i%4===0){
        const a=ang(t0);
        ctx.strokeStyle=TICK; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*(r+10),cy+Math.sin(a)*(r+10));
        ctx.lineTo(cx+Math.cos(a)*(r+16),cy+Math.sin(a)*(r+16));
        ctx.stroke();
      }
    }
    const a=ang(level);
    ctx.strokeStyle=TEAL; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*(r-26),cy+Math.sin(a)*(r-26)); ctx.stroke();
    ctx.fillStyle=info.color;
    ctx.beginPath();
    const tipX=cx+Math.cos(a)*(r-18), tipY=cy+Math.sin(a)*(r-18);
    const px=-Math.sin(a), py=Math.cos(a);
    ctx.moveTo(tipX,tipY);
    ctx.lineTo(tipX-Math.cos(a)*10+px*4, tipY-Math.sin(a)*10+py*4);
    ctx.lineTo(tipX-Math.cos(a)*10-px*4, tipY-Math.sin(a)*10-py*4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#0b1114'; ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=TEAL; ctx.lineWidth=1.5; ctx.stroke();
    const short=info.short||shortWord(info.label);
    const ff=getComputedStyle(document.body).fontFamily;
    ctx.fillStyle=info.color; ctx.font='700 20px '+ff; ctx.textAlign='center'; ctx.fillText(short,cx,cy+34);
    ctx.fillStyle='#8B9894'; ctx.font='10px '+ff; ctx.fillText(Math.round(level*100)+'%',cx,cy+50);
  }

  function setCard(id,info,comps){
    const s=services.find(x=>x.id===id);
    const stateEl=document.getElementById(id+'-state');
    const desc=document.getElementById(id+'-desc');
    const canvas=document.getElementById(id+'-g');
    const box=document.getElementById(id+'-comps');
    const card=canvas.closest('.card');
    info.short=info.short||shortWord(info.label);
    const dl=dataLevelFrom(info);
    card.dataset.level=dl;
    card.style.setProperty('--bar', info.color);
    stateEl.classList.remove('pulse');
    stateEl.textContent=info.label;
    stateEl.style.color=info.color;
    desc.textContent=info.detail||'';
    drawGauge(canvas,s,info);
    box.innerHTML=(comps||[]).slice(0,5).map(c=>{
      const cls=c.ok==='bad'?'bad':(c.ok==='warn'?'warn':'ok');
      return `<div class="comp"><span>${c.name}</span><span class="${cls}">${c.status}</span></div>`;
    }).join('') || `<div class="comp"><span>No components</span><span class="ok">—</span></div>`;
  }

  function parseIncidents(serviceId,j){
    const start=windowStart(), out=[];
    (j.incidents||[]).forEach(inc=>{
      const created=Date.parse(inc.created_at||inc.started_at||''); if(isNaN(created)) return;
      let resolvedAt=null; (inc.incident_updates||[]).forEach(u=>{ if((u.status||'').toLowerCase()==='resolved'){ const t=Date.parse(u.created_at||u.updated_at||''); if(!isNaN(t)) resolvedAt=t; }});
      const active=(inc.status||'').toLowerCase()!=='resolved';
      const end=active?now():(resolvedAt||Date.parse(inc.updated_at||inc.created_at)||created);
      if(end<start && !active) return;
      out.push({service:serviceId,name:inc.name||'Incident',status:inc.status||'unknown',start:created,end:Math.max(created+60000,end),active});
    });
    return out;
  }

  async function loadStatuspage(s){
    const bust='?_='+Date.now();
    const [sumRes,incRes]=await Promise.all([fetch(s.summary+bust,{cache:'no-store'}),fetch(s.incidents+bust,{cache:'no-store'})]);
    if(!sumRes.ok) throw new Error('summary HTTP '+sumRes.status);
    const sum=await sumRes.json();
    const info=levelFromIndicator(sum.status&&sum.status.indicator); info.detail=(sum.status&&sum.status.description)||'';
    const comps=(sum.components||[]).filter(c=>!c.group).slice(0,5).map(c=>({name:c.name,status:c.status,ok:c.status==='operational'?'ok':(c.status==='degraded_performance'||c.status==='partial_outage'?'warn':'bad')}));
    let incidents=[];
    if(incRes.ok){ const inc=await incRes.json(); incidents=parseIncidents(s.id,inc); const open=incidents.filter(i=>i.active); if(open.length){ info.detail=open[0].name+' — '+open[0].status; if(info.level>.5){info.level=.4;info.label='INCIDENT';info.color=YELLOW;} } }
    state[s.id].incidents=incidents; setCard(s.id,info,comps);
  }

  function classifyXaiStatus(st){
    st=(st||'').toLowerCase();
    if(st==='available'||st==='operational') return 'ok';
    if(st==='disruption'||st==='degraded'||st==='degraded_performance') return 'warn';
    if(st==='outage'||st==='down'||st==='major_outage') return 'bad';
    return 'warn';
  }

  async function loadXai(s){
    const r=await fetch(s.summary+'?_='+Date.now(),{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const html=await r.text();
    const names=['Grok (iOS)','Grok (Android)','Grok (Web)','Grok Build','Grok (Office/Workspace Plugins)','Single Sign-On','API (us-east-1.api.x.ai)','API (us-west-2.api.x.ai)','API (eu-west-1.api.x.ai)','API Console','Docs','xAI Website','Grok in X'];
    const comps=[];
    names.forEach(name=>{
      const esc=name.replace(/[()]/g,'\\$&');
      const re=new RegExp('children\\\\?":\\\\?"'+esc+'\\\\?"[\\s\\S]{0,240}?children\\\\?":\\\\?"(available|outage|disruption|operational|down)\\\\?"','i');
      const m=html.match(re);
      if(m){ const st=m[1].toLowerCase(); comps.push({name,status:st,ok:classifyXaiStatus(st)}); }
    });
    if(!comps.length){
      const clean=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,'\n');
      const lines=clean.split(/\n+/).map(x=>x.trim()).filter(Boolean);
      for(let i=0;i<lines.length-1;i++){
        if(names.includes(lines[i]) && /^(available|outage|disruption|operational|down)$/i.test(lines[i+1])){
          const st=lines[i+1].toLowerCase(); comps.push({name:lines[i],status:st,ok:classifyXaiStatus(st)});
        }
      }
    }
    const bad=comps.filter(c=>c.ok==='bad').length;
    const warn=comps.filter(c=>c.ok==='warn').length;
    let info;
    if(!comps.length) info={level:.45,label:'UNKNOWN',color:YELLOW,detail:'Could not parse status.x.ai service list.'};
    else if(bad) info={level:.18,label:'OUTAGE',color:RED,detail:bad+' xAI service(s) marked outage/down.'};
    else if(warn) info={level:.55,label:'DEGRADED',color:YELLOW,detail:warn+' xAI service(s) degraded/disrupted.'};
    else info={level:1,label:'OPERATIONAL',color:GREEN,detail:'All parsed xAI services available.'};
    const incidents=[];
    if(bad){ incidents.push({service:'xai',name:'One or more xAI services marked outage on status.x.ai',status:'ongoing',start:now(),end:now(),active:true,liveOnly:true}); }
    state.xai.incidents=incidents; setCard('xai',info,comps.slice(0,5));
  }

  function renderTimeline(){
    const axis=document.getElementById('axis'), hours=document.getElementById('hours'), events=document.getElementById('events');
    const start=windowStart(), end=now(), span=end-start;
    axis.innerHTML=services.map((s,idx)=>`<div class="tl-lane" style="top:${14+idx*22}px" id="lane-${s.id}"><div class="tl-lane-label" style="color:${s.color}">${s.id.toUpperCase()}</div></div>`).join('');
    const all=[]; services.forEach(s=>(state[s.id].incidents||[]).forEach(i=>all.push(i))); all.sort((a,b)=>b.start-a.start);
    all.forEach(i=>{
      if(i.liveOnly) return;
      const lane=document.getElementById('lane-'+i.service); if(!lane) return;
      const left=Math.max(0,(i.start-start)/span), right=Math.min(1,(i.end-start)/span), width=Math.max(.008,right-left);
      const seg=document.createElement('div'); seg.className='seg'; const color=services.find(x=>x.id===i.service).color;
      seg.style.left=(left*100)+'%'; seg.style.width=(width*100)+'%'; seg.style.background=color; seg.style.opacity=i.active?.95:.55;
      seg.style.boxShadow='0 0 6px '+color+'66'; lane.appendChild(seg);
    });
    all.filter(i=>i.liveOnly).forEach(i=>{
      const lane=document.getElementById('lane-'+i.service); if(!lane) return;
      const color=services.find(x=>x.id===i.service).color;
      const seg=document.createElement('div'); seg.className='seg'; seg.style.left='97.5%'; seg.style.width='2.5%'; seg.style.background=color; seg.style.boxShadow='0 0 6px '+color+'66'; lane.appendChild(seg);
    });
    const marks=[]; for(let h=0;h<=48;h+=12){ const t=new Date(start+h*3600*1000); marks.push(t.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric'})); }
    hours.innerHTML=marks.map(m=>`<span>${m}</span>`).join('');
    events.innerHTML=all.length?all.map(i=>{
      const svc=services.find(x=>x.id===i.service);
      const when=i.liveOnly?'NOW':new Date(i.start).toLocaleString();
      const badge=i.active?'<span class="badge active">ACTIVE</span>':'<span class="badge resolved">RESOLVED</span>';
      return `<div class="ev${i.active?' active':''}"><div class="when">${when}</div><div class="svc ${i.service}">${svc.name.split(' ')[0]}</div><div class="title">${i.name}${badge}</div></div>`;
    }).join('') : `<div class="ev"><div class="when">—</div><div class="svc">ALL</div><div class="title">Quiet 48h — no official incidents.</div></div>`;
  }

  async function refreshOne(s){
    const stateEl=document.getElementById(s.id+'-state');
    stateEl.classList.add('pulse'); stateEl.textContent='LOADING';
    try{ if(s.kind==='statuspage') await loadStatuspage(s); else await loadXai(s); }
    catch(e){ state[s.id].incidents=state[s.id].incidents||[]; setCard(s.id,{level:.35,label:'FEED ERROR',color:YELLOW,detail:String(e.message||e)},[]); }
  }
  async function refreshAll(){
    document.getElementById('footMsg').textContent='refreshing…';
    await Promise.all(services.map(refreshOne));
    renderTimeline();
    document.getElementById('updated').textContent=new Date().toLocaleString();
    document.getElementById('footMsg').textContent='browser fetches · auto 30s';
  }
  function applyTheme(name){
    const leo=name==='leonardo';
    if(leo) document.documentElement.setAttribute('data-theme','leonardo');
    else document.documentElement.removeAttribute('data-theme');
    try{ localStorage.setItem('gauge-theme', leo?'leonardo':'night'); }catch(e){}
    const stamp=document.getElementById('stamp');
    if(stamp) stamp.textContent=leo?'r9·FOLIO':'r9';
    const btn=document.getElementById('themeToggle');
    if(btn) btn.textContent=leo?'NIGHT':'FOLIO';
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', leo?'#F3E6CF':'#050708');
    refreshThemeConsts();
  }

  function initTheme(){
    let theme='night';
    try{
      const q=new URLSearchParams(location.search).get('theme');
      if(q==='leonardo'||q==='folio') theme='leonardo';
      else if(q==='night'||q==='r8'||q==='dark') theme='night';
      else {
        const stored=localStorage.getItem('gauge-theme');
        if(stored==='leonardo') theme='leonardo';
      }
    }catch(e){}
    applyTheme(theme);
  }

  document.addEventListener('click',ev=>{
    const tog=ev.target.closest('#themeToggle');
    if(tog){
      const next=isLeonardo()?'night':'leonardo';
      applyTheme(next);
      refreshAll();
      return;
    }
    const t=ev.target.closest('[data-refresh]'); if(!t) return;
    const id=t.getAttribute('data-refresh'); const s=services.find(x=>x.id===id);
    if(s) refreshOne(s).then(renderTimeline);
  });
  initTheme();
  refreshAll(); setInterval(refreshAll,30000);
})();

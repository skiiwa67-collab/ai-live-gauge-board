(function(){
  const GREEN='#3DFF8A', YELLOW='#FFD84D', RED='#FF3B3B', TEAL='#3EE0D4';
  const HOURS=48;
  const now=()=>Date.now();
  const windowStart=()=>now()-HOURS*3600*1000;
  const services=[
    {id:'claude',name:'CLAUDE',theme:'claude',themeLabel:'INK / PURPLE',official:'https://status.claude.com/',summary:'https://status.claude.com/api/v2/summary.json',incidents:'https://status.claude.com/api/v2/incidents.json',kind:'statuspage',color:'#C4B5FD'},
    {id:'openai',name:'OPENAI / CHATGPT',theme:'openai',themeLabel:'NEON LAB',official:'https://status.openai.com/',summary:'https://status.openai.com/api/v2/summary.json',incidents:'https://status.openai.com/api/v2/incidents.json',kind:'statuspage',color:'#5EEAD4'},
    {id:'xai',name:'xAI / GROK',theme:'xai',themeLabel:'ROCKET / SPACE',official:'https://status.x.ai/',summary:'https://status.x.ai/',incidents:null,kind:'xai-html',color:'#FCA5A5'},
    {id:'github',name:'GITHUB',theme:'github',themeLabel:'COMMIT GRAPH',official:'https://www.githubstatus.com/',summary:'https://www.githubstatus.com/api/v2/summary.json',incidents:'https://www.githubstatus.com/api/v2/incidents.json',kind:'statuspage',color:'#93C5FD'}
  ];
  const grid=document.getElementById('grid');
  const state={};
  services.forEach(s=>{
    const el=document.createElement('section');
    el.className='card theme-'+s.theme;
    el.innerHTML=`<div class="head"><div class="name">${s.name}</div><div class="state pulse" id="${s.id}-state">LOADING</div></div><p class="theme-tag">${s.themeLabel}</p><p class="desc" id="${s.id}-desc">Contacting feed…</p><div class="gauge-wrap"><canvas id="${s.id}-g" width="360" height="220"></canvas></div><div class="comps" id="${s.id}-comps"></div><div class="actions"><a class="btn" href="${s.official}" target="_blank" rel="noopener">OPEN STATUS</a><button class="btn" type="button" data-refresh="${s.id}">REFRESH</button></div>`;
    grid.appendChild(el); state[s.id]={incidents:[]};
  });

  function levelFromIndicator(ind){
    ind=(ind||'none').toLowerCase();
    if(ind==='none'||ind==='operational') return {level:1,label:'OPERATIONAL',color:GREEN};
    if(ind==='minor') return {level:.62,label:'DEGRADED',color:YELLOW};
    if(ind==='major') return {level:.28,label:'MAJOR',color:RED};
    if(ind==='critical') return {level:.08,label:'CRITICAL',color:RED};
    return {level:.4,label:String(ind).toUpperCase(),color:YELLOW};
  }

  function drawGauge(canvas,s,info){
    const dpr=Math.min(2,window.devicePixelRatio||1),W=360,H=220;
    canvas.width=W*dpr; canvas.height=H*dpr;
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    const cx=180,cy=145,r=86,start=Math.PI*1.1,end=Math.PI*-0.1,ang=t=>start+(end-start)*t;
    const level=Math.max(.02,Math.min(1,info.level));
    // light theme accents only
    if(s.theme==='xai'){ for(let i=0;i<18;i++){ ctx.fillStyle='rgba(243,246,244,.2)'; ctx.fillRect((i*53)%W,(i*17)%70,1.5,1.5);} ctx.fillStyle=info.color; ctx.beginPath(); ctx.moveTo(36,28); ctx.lineTo(42,44); ctx.lineTo(30,44); ctx.closePath(); ctx.fill(); }
    else if(s.theme==='claude'){ ctx.strokeStyle='rgba(196,181,253,.35)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(28,36); ctx.quadraticCurveTo(60,10,90,34); ctx.stroke(); }
    else if(s.theme==='openai'){ ctx.strokeStyle='rgba(94,234,212,.28)'; ctx.lineWidth=1; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(42,34,6+i*7,0,Math.PI*2); ctx.stroke(); } }
    else { for(let i=0;i<8;i++){ const h=6+(i*13)%18; ctx.fillStyle='rgba(147,197,253,.28)'; ctx.fillRect(28+i*8,52-h,5,h);} }
    ctx.lineWidth=11; ctx.lineCap='round'; ctx.strokeStyle='rgba(139,152,148,.18)'; ctx.beginPath(); ctx.arc(cx,cy,r,start,end,false); ctx.stroke();
    ctx.strokeStyle=info.color; ctx.shadowColor=info.color; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(cx,cy,r,start,ang(level),false); ctx.stroke(); ctx.shadowBlur=0;
    const a=ang(level); ctx.strokeStyle=TEAL; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*(r-24),cy+Math.sin(a)*(r-24)); ctx.stroke();
    ctx.fillStyle='#0b1114'; ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=TEAL; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle=info.color; ctx.font='700 13px '+getComputedStyle(document.body).fontFamily; ctx.textAlign='center'; ctx.fillText(info.label,cx,cy+34);
  }

  function setCard(id,info,comps){
    const s=services.find(x=>x.id===id);
    const stateEl=document.getElementById(id+'-state');
    const desc=document.getElementById(id+'-desc');
    const canvas=document.getElementById(id+'-g');
    const box=document.getElementById(id+'-comps');
    const card=canvas.closest('.card');
    stateEl.classList.remove('pulse'); stateEl.textContent=info.label; stateEl.style.color=info.color; card.style.setProperty('--bar',info.color); desc.textContent=info.detail||'';
    drawGauge(canvas,s,info);
    box.innerHTML=(comps||[]).slice(0,6).map(c=>{const cls=c.ok==='bad'?'bad':(c.ok==='warn'?'warn':'ok'); return `<div class="comp"><span>${c.name}</span><span class="${cls}">${c.status}</span></div>`;}).join('') || `<div class="comp"><span>No component list</span><span class="ok">—</span></div>`;
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
    const comps=(sum.components||[]).filter(c=>!c.group).slice(0,6).map(c=>({name:c.name,status:c.status,ok:c.status==='operational'?'ok':(c.status==='degraded_performance'||c.status==='partial_outage'?'warn':'bad')}));
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
    // Prefer RSC payload markers: "children":"Grok (iOS)" ... later "children":"available|outage"
    const names=['Grok (iOS)','Grok (Android)','Grok (Web)','Grok Build','Grok (Office/Workspace Plugins)','Single Sign-On','API (us-east-1.api.x.ai)','API (us-west-2.api.x.ai)','API (eu-west-1.api.x.ai)','API Console','Docs','xAI Website','Grok in X'];
    const comps=[];
    names.forEach(name=>{
      const esc=name.replace(/[()]/g,'\\$&');
      const re=new RegExp('children\\\\?":\\\\?"'+esc+'\\\\?"[\\s\\S]{0,240}?children\\\\?":\\\\?"(available|outage|disruption|operational|down)\\\\?"','i');
      const m=html.match(re);
      if(m){ const st=m[1].toLowerCase(); comps.push({name,status:st,ok:classifyXaiStatus(st)}); }
    });
    // fallback plain text pairs
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
    state.xai.incidents=incidents; setCard('xai',info,comps);
  }

  function renderTimeline(){
    const axis=document.getElementById('axis'), hours=document.getElementById('hours'), events=document.getElementById('events');
    const start=windowStart(), end=now(), span=end-start;
    axis.innerHTML=services.map((s,idx)=>`<div class="tl-lane" style="top:${14+idx*18}px" id="lane-${s.id}"><div class="tl-lane-label" style="color:${s.color}">${s.id.toUpperCase()}</div></div>`).join('');
    const all=[]; services.forEach(s=>(state[s.id].incidents||[]).forEach(i=>all.push(i))); all.sort((a,b)=>b.start-a.start);
    all.forEach(i=>{
      if(i.liveOnly) return;
      const lane=document.getElementById('lane-'+i.service); if(!lane) return;
      const left=Math.max(0,(i.start-start)/span), right=Math.min(1,(i.end-start)/span), width=Math.max(.008,right-left);
      const seg=document.createElement('div'); seg.className='seg'; const color=services.find(x=>x.id===i.service).color;
      seg.style.left=(left*100)+'%'; seg.style.width=(width*100)+'%'; seg.style.background=color; seg.style.opacity=i.active?.95:.55; lane.appendChild(seg);
    });
    all.filter(i=>i.liveOnly).forEach(i=>{
      const lane=document.getElementById('lane-'+i.service); if(!lane) return;
      const seg=document.createElement('div'); seg.className='seg'; seg.style.left='97.5%'; seg.style.width='2.5%'; seg.style.background=services.find(x=>x.id===i.service).color; lane.appendChild(seg);
    });
    const marks=[]; for(let h=0;h<=48;h+=12){ const t=new Date(start+h*3600*1000); marks.push(t.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric'})); }
    hours.innerHTML=marks.map(m=>`<span>${m}</span>`).join('');
    events.innerHTML=all.length?all.map(i=>{
      const svc=services.find(x=>x.id===i.service);
      const when=i.liveOnly?'NOW':new Date(i.start).toLocaleString();
      const badge=i.active?'<span class="badge active">ACTIVE</span>':'<span class="badge resolved">RESOLVED</span>';
      return `<div class="ev"><div class="when">${when}</div><div class="svc ${i.service}">${svc.name.split(' ')[0]}</div><div class="title">${i.name}${badge}</div></div>`;
    }).join('') : `<div class="ev"><div class="when">—</div><div class="svc">ALL</div><div class="title">No incidents in the last 48 hours from available official feeds.</div></div>`;
  }

  async function refreshOne(s){
    const stateEl=document.getElementById(s.id+'-state');
    stateEl.classList.add('pulse'); stateEl.textContent='REFRESH…';
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
  document.addEventListener('click',ev=>{
    const t=ev.target.closest('[data-refresh]'); if(!t) return;
    const id=t.getAttribute('data-refresh'); const s=services.find(x=>x.id===id);
    if(s) refreshOne(s).then(renderTimeline);
  });
  refreshAll(); setInterval(refreshAll,30000);
})();

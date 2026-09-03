(function(){
  const GREEN='#3DFF8A', YELLOW='#FFD84D', RED='#FF3B3B', TEAL='#3EE0D4';
  const HOURS=48;
  const now=()=>Date.now();
  const windowStart=()=>now()-HOURS*3600*1000;
  const services=[
    {id:'claude',name:'CLAUDE',theme:'claude',themeLabel:'COURTLY INK',official:'https://status.claude.com/',summary:'https://status.claude.com/api/v2/summary.json',incidents:'https://status.claude.com/api/v2/incidents.json',kind:'statuspage',color:'#C4B5FD'},
    {id:'openai',name:'OPENAI / CHATGPT',theme:'openai',themeLabel:'NEON LAB',official:'https://status.openai.com/',summary:'https://status.openai.com/api/v2/summary.json',incidents:'https://status.openai.com/api/v2/incidents.json',kind:'statuspage',color:'#5EEAD4'},
    {id:'xai',name:'xAI / GROK',theme:'xai',themeLabel:'ROCKET RANGE',official:'https://status.x.ai/',summary:'https://status.x.ai/',incidents:null,kind:'xai-html',color:'#FCA5A5'},
    {id:'github',name:'GITHUB',theme:'github',themeLabel:'COMMIT GRAPH',official:'https://www.githubstatus.com/',summary:'https://www.githubstatus.com/api/v2/summary.json',incidents:'https://www.githubstatus.com/api/v2/incidents.json',kind:'statuspage',color:'#93C5FD'}
  ];
  const grid=document.getElementById('grid');
  const state={};
  services.forEach(s=>{
    const el=document.createElement('section');
    el.className='card theme-'+s.theme;
    el.innerHTML=`<div class="head"><div class="name">${s.name}</div><div class="state pulse" id="${s.id}-state">LOADING</div></div><p class="theme-tag">${s.themeLabel}</p><p class="desc" id="${s.id}-desc">Contacting official feed…</p><div class="gauge-wrap"><canvas id="${s.id}-g" width="360" height="240"></canvas></div><div class="comps" id="${s.id}-comps"></div><div class="actions"><a class="btn" href="${s.official}" target="_blank" rel="noopener">OPEN STATUS</a><button class="btn" type="button" data-refresh="${s.id}">REFRESH</button></div>`;
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
  function drawThemedGauge(canvas,s,info){
    const dpr=Math.min(2,window.devicePixelRatio||1),W=360,H=240;
    canvas.width=W*dpr; canvas.height=H*dpr;
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    const cx=180,cy=158,r=100,start=Math.PI*1.08,end=Math.PI*-0.08,ang=t=>start+(end-start)*t;
    const level=Math.max(.02,Math.min(1,info.level));
    if(s.theme==='xai'){
      for(let i=0;i<28;i++){ctx.fillStyle=`rgba(243,246,244,${.15+(i%5)*.05})`;ctx.fillRect((i*47)%W,(i*29)%110,2,2);}
      ctx.save();ctx.translate(48,42);ctx.rotate(-.5);ctx.fillStyle='#F3F6F4';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(8,10);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.fillStyle=info.color;ctx.fillRect(-3,10,6,8);ctx.restore();
    } else if(s.theme==='claude'){
      ctx.fillStyle='rgba(196,181,253,.08)';ctx.beginPath();ctx.ellipse(70,48,46,22,-.3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(196,181,253,.16)';ctx.beginPath();ctx.arc(292,40,10,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(196,181,253,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(250,58);ctx.quadraticCurveTo(270,90,300,70);ctx.stroke();
    } else if(s.theme==='openai'){
      ctx.strokeStyle='rgba(94,234,212,.2)';ctx.lineWidth=1;for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(60,44,8+i*7,0,Math.PI*2);ctx.stroke();}
      ctx.strokeStyle='rgba(94,234,212,.35)';ctx.beginPath();ctx.moveTo(280,24);ctx.lineTo(320,24);ctx.lineTo(320,64);ctx.stroke();
    } else {
      for(let i=0;i<12;i++){const h=8+(i*17)%28;ctx.fillStyle=`rgba(147,197,253,${.15+(i%3)*.1})`;ctx.fillRect(30+i*12,70-h,8,h);}
    }
    ctx.lineWidth=14;ctx.lineCap='round';ctx.strokeStyle='rgba(139,152,148,.18)';ctx.beginPath();ctx.arc(cx,cy,r,start,end,false);ctx.stroke();
    ctx.strokeStyle=info.color;ctx.shadowColor=info.color;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(cx,cy,r,start,ang(level),false);ctx.stroke();ctx.shadowBlur=0;
    for(let i=0;i<=10;i++){const a=ang(i/10);ctx.strokeStyle='rgba(243,246,244,.22)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(r-22),cy+Math.sin(a)*(r-22));ctx.lineTo(cx+Math.cos(a)*(r-15),cy+Math.sin(a)*(r-15));ctx.stroke();}
    const a=ang(level);ctx.strokeStyle=TEAL;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*(r-30),cy+Math.sin(a)*(r-30));ctx.stroke();
    ctx.fillStyle='#0b1114';ctx.beginPath();ctx.arc(cx,cy,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle=TEAL;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=info.color;ctx.font='700 15px '+getComputedStyle(document.body).fontFamily;ctx.textAlign='center';ctx.fillText(info.label,cx,cy+40);
  }
  function setCard(id,info,comps){
    const s=services.find(x=>x.id===id), stateEl=document.getElementById(id+'-state'), desc=document.getElementById(id+'-desc'), canvas=document.getElementById(id+'-g'), box=document.getElementById(id+'-comps'), card=canvas.closest('.card');
    stateEl.classList.remove('pulse'); stateEl.textContent=info.label; stateEl.style.color=info.color; card.style.setProperty('--bar',info.color); desc.textContent=info.detail||'';
    drawThemedGauge(canvas,s,info);
    box.innerHTML=(comps||[]).slice(0,8).map(c=>{const cls=c.ok==='bad'?'bad':(c.ok==='warn'?'warn':'ok');return `<div class="comp"><span>${c.name}</span><span class="${cls}">${c.status}</span></div>`;}).join('')||`<div class="comp"><span>No component list</span><span class="ok">—</span></div>`;
  }
  function parseIncidents(serviceId,j){
    const start=windowStart(), out=[];
    (j.incidents||[]).forEach(inc=>{
      const created=Date.parse(inc.created_at||inc.started_at||''); if(isNaN(created)) return;
      let resolvedAt=null; (inc.incident_updates||[]).forEach(u=>{ if((u.status||'').toLowerCase()==='resolved'){ const t=Date.parse(u.created_at||u.updated_at||''); if(!isNaN(t)) resolvedAt=t; } });
      const active=(inc.status||'').toLowerCase()!=='resolved';
      const end=active?now():(resolvedAt||Date.parse(inc.updated_at||inc.created_at)||created);
      if(end<start && !active) return;
      out.push({service:serviceId,name:inc.name||'Incident',status:inc.status||'unknown',start:created,end:Math.max(created+60000,end),active});
    });
    return out;
  }
  async function loadStatuspage(s){
    const [sumRes,incRes]=await Promise.all([fetch(s.summary,{cache:'no-store'}),fetch(s.incidents,{cache:'no-store'})]);
    if(!sumRes.ok) throw new Error('summary HTTP '+sumRes.status);
    const sum=await sumRes.json();
    const info=levelFromIndicator(sum.status&&sum.status.indicator); info.detail=(sum.status&&sum.status.description)||'';
    const comps=(sum.components||[]).filter(c=>!c.group).slice(0,8).map(c=>({name:c.name,status:c.status,ok:c.status==='operational'?'ok':(c.status==='degraded_performance'||c.status==='partial_outage'?'warn':'bad')}));
    let incidents=[];
    if(incRes.ok){ const inc=await incRes.json(); incidents=parseIncidents(s.id,inc); const open=incidents.filter(i=>i.active); if(open.length){ info.detail=open[0].name+' — '+open[0].status; if(info.level>.5){info.level=.4;info.label='INCIDENT';info.color=YELLOW;} } }
    state[s.id].incidents=incidents; setCard(s.id,info,comps);
  }
  async function loadXai(s){
    const r=await fetch(s.summary,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const html=await r.text();
    const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    const outage=(text.match(/\boutage\b/gi)||[]).length, operational=(text.match(/fully operational|service fully operational/gi)||[]).length;
    let info;
    if(outage>=1) info={level:.18,label:'OUTAGE',color:RED,detail:'xAI status page reports one or more service/model outages.'};
    else if(operational>=1) info={level:1,label:'OPERATIONAL',color:GREEN,detail:'No outage markers found on status.x.ai.'};
    else info={level:.5,label:'UNKNOWN',color:YELLOW,detail:'Could not classify xAI HTML. Open official page.'};
    const comps=[];
    ['Grok (iOS)','Grok (Android)','Grok (Web)','API (us-east-1.api.x.ai)','API (us-west-2.api.x.ai)','API (eu-west-1.api.x.ai)','API Console'].forEach(name=>{
      const re=new RegExp(name.replace(/[()]/g,'\\$&')+'[\\s\\S]{0,90}?(outage|operational|disruption)','i'); const m=text.match(re);
      if(m){ const st=m[1].toLowerCase(); comps.push({name,status:st,ok:st==='operational'?'ok':(st==='disruption'?'warn':'bad')}); }
    });
    // No fake history: only an ACTIVE marker with no invented start bar on the axis.
    const incidents=[];
    if(outage>=1){ incidents.push({service:'xai',name:'Outage markers currently present on status.x.ai',status:'ongoing',start:now(),end:now(),active:true,liveOnly:true}); }
    state.xai.incidents=incidents; setCard('xai',info,comps);
  }
  function renderTimeline(){
    const axis=document.getElementById('axis'), hours=document.getElementById('hours'), events=document.getElementById('events');
    const start=windowStart(), end=now(), span=end-start;
    axis.innerHTML=services.map((s,idx)=>`<div class="tl-lane" style="top:${18+idx*24}px" id="lane-${s.id}"><div class="tl-lane-label" style="color:${s.color}">${s.id.toUpperCase()}</div></div>`).join('');
    const all=[]; services.forEach(s=>(state[s.id].incidents||[]).forEach(i=>all.push(i))); all.sort((a,b)=>b.start-a.start);
    all.forEach(i=>{
      if(i.liveOnly) return; // no fake-duration bar
      const lane=document.getElementById('lane-'+i.service); if(!lane) return;
      const left=Math.max(0,(i.start-start)/span), right=Math.min(1,(i.end-start)/span), width=Math.max(.008,right-left);
      const seg=document.createElement('div'); seg.className='seg'; const color=services.find(x=>x.id===i.service).color;
      seg.style.left=(left*100)+'%'; seg.style.width=(width*100)+'%'; seg.style.background=color; seg.style.opacity=i.active?.95:.55; lane.appendChild(seg);
    });
    // live-only xAI marker at "now"
    all.filter(i=>i.liveOnly).forEach(i=>{
      const lane=document.getElementById('lane-'+i.service); if(!lane) return;
      const seg=document.createElement('div'); seg.className='seg'; seg.style.left='98%'; seg.style.width='2%'; seg.style.background=services.find(x=>x.id===i.service).color; seg.title='Active now'; lane.appendChild(seg);
    });
    const marks=[]; for(let h=0;h<=48;h+=12){ const t=new Date(start+h*3600*1000); marks.push(t.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric'})); }
    hours.innerHTML=marks.map(m=>`<span>${m}</span>`).join('');
    events.innerHTML=all.length?all.map(i=>{
      const svc=services.find(x=>x.id===i.service);
      const when=i.liveOnly?'NOW':new Date(i.start).toLocaleString();
      const badge=i.active?'<span class="badge active">ACTIVE</span>':'<span class="badge resolved">RESOLVED</span>';
      return `<div class="ev"><div class="when">${when}</div><div class="svc ${i.service}">${svc.name.split(' ')[0]}</div><div class="title">${i.name}${badge}<div style="color:#8B9894;font-size:11px;margin-top:3px">${i.status}</div></div></div>`;
    }).join('') : `<div class="ev"><div class="when">—</div><div class="svc">ALL</div><div class="title">No incidents in the last 48 hours from available official feeds.</div></div>`;
  }
  async function refreshOne(s){ try{ if(s.kind==='statuspage') await loadStatuspage(s); else await loadXai(s); } catch(e){ state[s.id].incidents=state[s.id].incidents||[]; setCard(s.id,{level:.35,label:'FEED ERROR',color:YELLOW,detail:String(e.message||e)},[]); } }
  async function refreshAll(){ document.getElementById('footMsg').textContent='refreshing…'; await Promise.all(services.map(refreshOne)); renderTimeline(); document.getElementById('updated').textContent=new Date().toLocaleString(); document.getElementById('footMsg').textContent='browser fetches · auto 30s'; }
  document.addEventListener('click',ev=>{ const id=ev.target&&ev.target.getAttribute&&ev.target.getAttribute('data-refresh'); if(!id) return; const s=services.find(x=>x.id===id); if(s) refreshOne(s).then(renderTimeline); });
  refreshAll(); setInterval(refreshAll,30000);
})();

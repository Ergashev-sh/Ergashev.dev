/* Ergashev.dev Ghost Admin – vanilla JS, no UI framework */
(() => {
  'use strict';
  const API = '/.netlify/functions/ghost-api';
  const KEY = 'ERGASHEV';
  const $ = (s,root=document) => root.querySelector(s);
  const escape = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={ authed:false,tab:'dashboard',data:{},sha:{},draft:{},editIndex:null,mediaUrl:'',showPreview:false };
  let launch, overlay, shell, main, clicks=0,lastClick=0,typed='',toastTimer;
  const action = async (name,body,method='POST') => {
    const opts={method,credentials:'same-origin',headers:{'x-ghost-request':'1'}};
    if(body instanceof FormData) opts.body=body;
    else if(method!=='GET'){opts.headers['content-type']='application/json';opts.body=JSON.stringify(body||{});}
    const params = new URLSearchParams({action:name});
    if(method==='GET' && body) Object.entries(body).forEach(([k,v])=>params.set(k,v));
    const response=await fetch(`${API}?${params}`,opts);
    const result=await response.json().catch(()=>({error:'Server javobi noto‘g‘ri'}));
    if(!response.ok) throw Error(result.error||`HTTP ${response.status}`);
    return result;
  };
  function toast(msg,err=false){document.querySelector('.ghost-toast')?.remove();const d=document.createElement('div');d.className='ghost-toast';d.setAttribute('role','status');d.style.border='1px solid '+(err?'#fb7185':'#58e3cb');d.textContent=msg;document.body.append(d);clearTimeout(toastTimer);toastTimer=setTimeout(()=>d.remove(),4500);}
  function draw(html){main.innerHTML=html;}
  function close(){overlay.hidden=true;document.body.style.overflow='';launch.focus();}
  function open(){overlay.hidden=false;document.body.style.overflow='hidden';draw('<p class="ghost-kicker">$ connect ghost-admin --secure</p><p>Authentication check...</p>');action('session',null,'GET').then(r=>{state.authed=r.authenticated;if(r.authenticated)dashboard();else login();}).catch(()=>login());}
  function login(error=''){
    draw(`<div style="max-width:480px;margin:auto"><p class="ghost-kicker">$ sudo ghost-admin --login</p><h3>Ghost Access</h3><p>Admin rejimga kirish uchun parolni kiriting.</p><form id="ghost-login-form"><label for="ghost-password">Admin parol</label><input type="password" id="ghost-password" autocomplete="current-password" minlength="1" required autofocus><div class="ghost-row" style="margin-top:15px"><button class="ghost-primary" type="submit">Unlock →</button><button type="button" id="ghost-exit">Chiqish</button></div></form><p role="alert" style="color:#fb7185">${escape(error)}</p></div>`);
    $('#ghost-exit',main).onclick=close;
    $('#ghost-login-form',main).onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{await action('login',{password:$('#ghost-password',main).value});state.authed=true;toast('Admin rejimiga xush kelibsiz');dashboard();}catch(x){login(x.message);}finally{btn.disabled=false;}};
    $('#ghost-password',main).focus();
  }
  function nav(active){const tabs=[['dashboard','Statistika'],['projects','Loyihalar'],['blogs','Blog'],['profile','Profil'],['design','Dizayn'],['seo','SEO'],['media','Rasmlar'],['history','Tarix'],['activity','Faoliyat']];return `<nav class="ghost-nav" aria-label="Admin bo‘limlari">${tabs.map(([t,label])=>`<button data-tab="${t}" class="${t===active?'active':''}">${label}</button>`).join('')}<button data-tab="logout" class="ghost-danger">Chiqish</button></nav>`;}
  function withNav(html){draw(nav(state.tab)+html);main.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));}
  async function switchTab(tab){if(tab==='logout'){await action('logout');state.authed=false;disableLiveEdit();login();return;}state.tab=tab;state.editIndex=null;if(tab==='dashboard')dashboard();else if(['projects','blogs'].includes(tab)) list(tab);else if(['profile','design','seo'].includes(tab))settings(tab);else if(tab==='media')media();else if(tab==='history')history();else if(tab==='activity')activity();}
  function dashboard(){
    withNav(`<div class="ghost-row" style="justify-content:space-between"><div><p class="ghost-kicker">OVERVIEW / LIVE ANALYTICS</p><h3>Ghost Dashboard</h3></div><span class="ghost-muted">Asia/Tashkent (UTC+5)</span></div>
      <p class="ghost-muted">Kunlik, oxirgi 7 kun va joriy oy: tashriflar hamda taxminiy noyob brauzerlar.</p>
      <div class="ghost-grid" id="ghost-metrics"><div class="ghost-card">Hisoblanmoqda...</div></div>
      <div class="ghost-card"><h3>Oxirgi 14 kun — ko‘rishlar</h3><div id="ghost-days">Yuklanmoqda...</div></div>
      <div class="ghost-card"><h3>Tezkor amallar</h3><div class="ghost-row"><button data-tab="projects">+ Loyiha</button><button data-tab="blogs">+ Blog</button><button data-tab="design">🎨 Dizayn</button><button id="ghost-inline">✏️ Live Edit</button><button id="ghost-preview">👁 Preview</button></div></div>
      <p class="ghost-muted" id="ghost-stats-note">Statistika sayt kuzatuv kodi ishlagan kundan boshlab yig‘iladi.</p>`);
    main.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
    $('#ghost-inline',main).onclick=()=>{close();enableLiveEdit();};
    $('#ghost-preview',main).onclick=()=>{close();toast('Sayt foydalanuvchi ko‘rinishida ochildi.');};
    action('stats',null,'GET').then(s=>{
      const data=[['BUGUN · KO‘RISHLAR',s.today.views],['BUGUN · NOYOB',s.today.visitors],
        ['7 KUN · KO‘RISHLAR',s.week.views],['7 KUN · NOYOB',s.week.visitors],
        ['OY · KO‘RISHLAR',s.month.views],['OY · NOYOB',s.month.visitors],
        ['JAMI KO‘RISHLAR',s.total.views],['LOYIHA BOSISHLARI',s.total.projectClicks]];
      const holder=$('#ghost-metrics',main);if(holder)holder.innerHTML=data.map(([k,v])=>`<div class="ghost-card"><span class="ghost-kicker">${escape(k)}</span><strong>${Number(v||0).toLocaleString('uz-UZ')}</strong></div>`).join('');
      const rows=(s.days||[]).slice(-14),max=Math.max(1,...rows.map(x=>x.views));
      const bar=$('#ghost-days',main);
      if(bar)bar.innerHTML=rows.length?`<div class="ghost-stat-chart" role="img" aria-label="Oxirgi kunlar ko‘rishlar grafigi">${rows.map(x=>`<div class="ghost-stat-bar" style="height:${Math.max(3,Math.round(x.views/max*100))}%" data-label="${escape(x.date.slice(5))}" title="${escape(x.date)}: ${Number(x.views)} ko‘rish, ${Number(x.visitors)} noyob"></div>`).join('')}</div>`:'Hali qayd etilgan tashrif yo‘q.';
      const note=$('#ghost-stats-note',main);if(note)note.textContent=(s.note||'')+(s.sampled?' ⚠ Limit sabab ayrim sonlar taxminiy.':'');
    }).catch(e=>toast('Statistika: '+e.message,true));
  }
  const blank = type=> type==='projects' ? ({id:crypto.randomUUID(),title:'',category:'Web',summary:'',description:'',year:String(new Date().getFullYear()),glyph:'✳',theme:'blue',image:'',tags:[],demo_url:'',github_url:'',status:'published',is_demo:false})
   : ({id:crypto.randomUUID(),title:'',excerpt:'',body:'',date:new Date().toISOString().slice(0,10),category:'NOTES',status:'published',is_demo:false});
  async function list(type){
    withNav(`<div class="ghost-row" style="justify-content:space-between"><h3>${type==='blogs'?'Maqolalar':'Loyihalar'}</h3><button class="ghost-primary" id="ghost-add">+ Yangi</button></div><p>O‘zgarishlar avval brauzerda saqlanadi, “Nashr qilish” GitHub'ga commit yuboradi.</p><div id="ghost-items">Yuklanmoqda...</div><div class="ghost-row" style="margin-top:15px"><button id="ghost-draft">Qoralama saqlash</button><button id="ghost-load-draft">Qoralamani ochish</button><button class="ghost-primary" id="ghost-publish">Nashr qilish</button><button id="ghost-live-preview">Oldindan ko‘rish</button></div>`);
    $('#ghost-add',main).onclick=()=>edit(type,-1);
    $('#ghost-draft',main).onclick=()=>saveDraft(type);$('#ghost-load-draft',main).onclick=()=>loadDraft(type);
    $('#ghost-publish',main).onclick=()=>publish(type);
    $('#ghost-live-preview',main).onclick=()=>preview(type);
    try{const r=await action('data',{type},'GET');state.data[type]=Array.isArray(r.data)?r.data.map(item=>({...item,status:item.status||'published'})):[];state.sha[type]=r.sha||null;renderItems(type);}catch(e){$('#ghost-items',main).textContent=e.message;}
  }
  function renderItems(type){const holder=$('#ghost-items',main);if(!holder)return;holder.innerHTML=`<div class="ghost-list">${state.data[type].map((v,i)=>`<div class="ghost-listitem"><div><b>${escape(v.title)}</b><small>${escape(v.category||v.date||'')} • ${escape(v.status||'published')}</small></div><div class="ghost-row"><button data-edit="${i}">Tahrirlash</button><button data-delete="${i}" class="ghost-danger">O‘chirish</button></div></div>`).join('')||'<p>Hali yozuv yo‘q.</p>'}</div>`;
    holder.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(type,Number(b.dataset.edit)));
    holder.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('Ushbu elementni ro‘yxatdan o‘chirasizmi?')){state.data[type].splice(Number(b.dataset.delete),1);renderItems(type);}});
  }
  async function loadDraft(type){try{const r=await action('draft',{type},'GET');const entries=Array.isArray(r.data)?r.data:[];if(!entries.length)return toast('Qoralama bo‘sh.');const existing=state.data[type]||[];for(const item of entries){const idx=existing.findIndex(x=>x.id===item.id);if(idx<0)existing.push(item);else existing[idx]=item;}state.data[type]=existing;listCached(type);toast('Qoralama ochildi.');}catch(e){toast(e.message,true);}}
  function edit(type,index){
    const item=index<0?blank(type):{...state.data[type][index]};
    const fields=type==='projects'?
      [['title','Loyiha nomi'],['category','Kategoriya (Web / Telegram bot / Dastur)'],['summary','Qisqa tavsif'],['description','Batafsil tavsif'],['image','Rasm yo‘li (Media Manager dan)'],['demo_url','Jonli demo URL'],['github_url','GitHub URL'],['tags','Texnologiyalar (vergul bilan)'],['year','Yil'],['glyph','Belgisi'],['theme','Karta mavzusi: lime / purple / blue / orange']]:
      [['title','Maqola nomi'],['excerpt','Qisqa tavsif'],['body','To‘liq maqola'],['category','Kategoriya'],['date','Sana (YYYY-MM-DD)']];
    const form=fields.map(([k,l])=>`<div class="${['description','body'].includes(k)?'wide':''}"><label for="gf-${k}">${escape(l)}</label>${['description','body'].includes(k)?`<textarea name="${k}" id="gf-${k}">${escape(item[k]||'')}</textarea>`:`<input id="gf-${k}" name="${k}" value="${escape(k==='tags'?(item.tags||[]).join(', '):item[k]||'')}">`}</div>`).join('');
    withNav(`<h3>${index<0?'Yangi':'Tahrirlash'} ${type==='blogs'?'maqola':'loyiha'}</h3><form id="ghost-edit-form"><div class="ghost-form-grid">${form}<div><label for="gf-status">Holat</label><select id="gf-status" name="status"><option value="published" ${item.status==='published'?'selected':''}>Nashrda</option><option value="draft" ${item.status==='draft'?'selected':''}>Qoralama</option><option value="hidden" ${item.status==='hidden'?'selected':''}>Yashirilgan</option></select></div></div><div class="ghost-row" style="margin-top:15px"><button class="ghost-primary" type="submit">Saqlash (vaqtincha)</button><button id="ghost-cancel" type="button">Orqaga</button></div></form>`);
    $('#ghost-cancel',main).onclick=()=>listCached(type);
    $('#ghost-edit-form',main).onsubmit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);for(const [k,v] of data.entries())item[k]=k==='tags'?String(v).split(',').map(x=>x.trim()).filter(Boolean):String(v).trim();if(!item.title){toast('Nomi bo‘sh bo‘lmasin',true);return;}if(index<0)state.data[type].push(item);else state.data[type][index]=item;toast('Tahrir tayyor. Nashr qilish yoki Qoralama saqlashni bosing.');listCached(type);};
  }
  function listCached(type){state.tab=type;withNav(`<div class="ghost-row" style="justify-content:space-between"><h3>${type==='blogs'?'Maqolalar':'Loyihalar'}</h3><button class="ghost-primary" id="ghost-add">+ Yangi</button></div><div id="ghost-items"></div><div class="ghost-row" style="margin-top:15px"><button id="ghost-draft">Qoralama saqlash</button><button id="ghost-load-draft">Qoralamani ochish</button><button class="ghost-primary" id="ghost-publish">Nashr qilish</button><button id="ghost-live-preview">Oldindan ko‘rish</button></div>`);renderItems(type);$('#ghost-add',main).onclick=()=>edit(type,-1);$('#ghost-draft',main).onclick=()=>saveDraft(type);$('#ghost-load-draft',main).onclick=()=>loadDraft(type);$('#ghost-publish',main).onclick=()=>publish(type);$('#ghost-live-preview',main).onclick=()=>preview(type);}
  async function saveDraft(type){try{await action('draft',{type,data:state.data[type]});toast('Qoralama Netlify Blobs’da saqlandi');}catch(e){toast(e.message,true);}}
  async function publish(type){if(!confirm('GitHub’ga commit yaratib saytni yangilaysizmi?'))return;try{const r=await action('save',{type,data:state.data[type],sha:state.sha[type]});state.sha[type]=r.sha||null;toast('GitHub commit yaratildi; Netlify qayta deploy qiladi.');}catch(e){toast(e.message,true);}}
  function preview(type){const items=state.data[type]||[];withNav(`<h3>Preview: ${type}</h3><p>Bu admin uchun matnli oldindan ko‘rish. Saytdagi haqiqiy ko‘rinish kontent rendereriga bog‘liq.</p><div class="ghost-list">${items.map(v=>`<div class="ghost-card"><span class="ghost-kicker">${escape(v.category)}</span><h3>${escape(v.title)}</h3><p>${escape(v.description)}</p></div>`).join('')}</div><button id="ghost-back">Orqaga</button>`);$('#ghost-back',main).onclick=()=>listCached(type);}
  async function settings(type){
    const definitions={
      profile:[['site_title','Sayt nomi'],['hero_description','Bosh sahifa tavsifi'],['about_text','Men haqimda'],['github_url','GitHub manzili'],['contact_url','Aloqa havolasi'],['avatar','Profil rasmi (assets/uploads/...)']],
      design:[['theme','Tema (teal, blue, purple, green, orange)'],['accent','Asosiy rang (#63e7cf)'],['accent2','Ikkinchi rang (#a8a3ff)'],['speed','Animatsiya tezligi (0–100)']],
      seo:[['title','SEO sarlavhasi'],['description','Google tavsifi']]
    };
    withNav(`<h3>${type==='profile'?'Profil':type==='design'?'Ranglar va animatsiya':'SEO sozlamalari'}</h3><div id="ghost-settings-form">Yuklanmoqda...</div>`);
    try{
      const loaded=await action('data',{type},'GET');const data=loaded.data;state.sha[type]=loaded.sha||null;
      const formHtml=definitions[type].map(([k,l])=>`<div class="${['hero_description','about_text','description'].includes(k)?'wide':''}"><label for="gs-${k}">${escape(l)}</label>${['hero_description','about_text','description'].includes(k)?`<textarea id="gs-${k}" name="${k}">${escape(data[k]||'')}</textarea>`:`<input id="gs-${k}" name="${k}" value="${escape(data[k]??'')}">`}</div>`).join('');
      $('#ghost-settings-form',main).innerHTML=`<form id="ghost-settings"><div class="ghost-form-grid">${formHtml}</div><div class="ghost-row" style="margin-top:16px"><button type="button" id="gs-draft">Qoralama</button><button type="button" id="gs-load">Qoralamani ochish</button><button class="ghost-primary" type="submit">GitHub'ga nashr qilish</button>${type==='design'?'<button type="button" id="gs-colors">Ranglarni sinash</button>':''}</div></form>`;
      const form=$('#ghost-settings',main),gather=()=>Object.fromEntries(new FormData(form));
      if(type==='design')$('#gs-colors',main).onclick=()=>{const d=gather();if(/^#[a-f0-9]{6}$/i.test(d.accent))document.documentElement.style.setProperty('--acid',d.accent);if(/^#[a-f0-9]{6}$/i.test(d.accent2))document.documentElement.style.setProperty('--violet',d.accent2);toast('Ranglar oldindan ko‘rildi.');};
      $('#gs-draft',main).onclick=async()=>{try{await action('draft',{type,data:gather()});toast('Qoralama saqlandi');}catch(e){toast(e.message,true);}};
      $('#gs-load',main).onclick=async()=>{try{const saved=(await action('draft',{type},'GET')).data;for(const field of Object.keys(saved||{})){const el=form.elements.namedItem(field);if(el)el.value=saved[field];}toast('Qoralama ochildi');}catch(e){toast(e.message,true);}};
      form.onsubmit=async e=>{e.preventDefault();try{const saved=await action('save',{type,data:gather(),sha:state.sha[type]});state.sha[type]=saved.sha||null;toast('GitHub commit yaratildi. Netlify deploy tugagach ko‘rinadi.');}catch(e){toast(e.message,true);}};
    }catch(e){$('#ghost-settings-form',main).textContent=e.message;}
  }
  function media(){withNav(`<h3>Media Manager</h3><p>Rasmlar GitHub'ning <code>assets/uploads/</code> papkasiga qo‘shiladi. Faqat JPG/PNG/WebP/GIF va 3 MB gacha.</p><form id="ghost-upload-form"><label for="ghost-file">Rasmni tanlang</label><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" id="ghost-file" required><div class="ghost-row" style="margin-top:12px"><button class="ghost-primary" type="submit">GitHub’ga yuklash</button></div></form><div id="ghost-upload-link"></div>`);$('#ghost-upload-form',main).onsubmit=async e=>{e.preventDefault();const file=$('#ghost-file',main).files[0];if(!file||file.size>3*1024*1024){toast('Fayl 3 MB dan oshmasin',true);return;}const form=new FormData();form.append('file',file);try{const r=await action('upload',form);const output=$('#ghost-upload-link',main);output.textContent='Rasm manzili: '+r.path;state.mediaUrl=r.path;toast('Rasm GitHub’ga yuklandi');}catch(err){toast(err.message,true);}};}
  async function history(){withNav(`<h3>Version History</h3><p>GitHub’dagi avvalgi commitlarni ko‘rish va tanlangan ma’lumot faylini tiklash.</p><div class="ghost-row"><button data-history="projects">Loyihalar</button><button data-history="blogs">Blog</button><button data-history="profile">Profil</button><button data-history="design">Ranglar</button><button data-history="seo">SEO</button></div><div id="ghost-history-list" class="ghost-list" style="margin-top:14px">Turini tanlang</div>`);main.querySelectorAll('[data-history]').forEach(b=>b.onclick=async()=>{const type=b.dataset.history;const box=$('#ghost-history-list',main);box.textContent='Yuklanmoqda...';try{const list=(await action('history',{type},'GET'));box.innerHTML=list.map(v=>`<div class="ghost-listitem"><div><b>${escape(v.message.slice(0,80))}</b><small>${escape(v.date||'')} • ${escape(v.sha.slice(0,8))}</small></div><button data-sha="${escape(v.sha)}">Tiklash</button></div>`).join('')||'Tarix bo‘sh';box.querySelectorAll('[data-sha]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Joriy kontent o‘rniga eski versiyani GitHub’ga commit qilamizmi?'))return;try{await action('rollback',{type,sha:btn.dataset.sha});toast('Eski versiya yangi commit sifatida tiklandi');}catch(e){toast(e.message,true);}});}catch(e){box.textContent=e.message;}});}
  async function activity(){withNav('<h3>Activity Log</h3><div id="ghost-activity">Yuklanmoqda...</div>');try{const items=await action('activity',null,'GET');$('#ghost-activity',main).innerHTML=items.length?items.map(v=>`<div class="ghost-listitem"><div><b>${escape(v.action)}</b><small>${escape(v.time||v.at)}</small></div></div>`).join(''):'Hali faoliyat yo‘q';}catch(e){$('#ghost-activity',main).textContent=e.message;}}
  let liveOriginal = null;
  function enableLiveEdit(){
    const nodes=[...document.querySelectorAll('[data-ghost-field]')];
    if(!nodes.length){toast('Avval saytdagi matnlarga data-ghost-field atributi qo‘shilishi kerak.',true);return;}
    liveOriginal=nodes.map(el=>[el,el.textContent]);
    nodes.forEach(el=>{el.contentEditable='true';el.classList.add('ghost-editable');el.setAttribute('spellcheck','false');});
    document.getElementById('ghost-live-bar')?.remove();
    const bar=document.createElement('div');bar.id='ghost-live-bar';bar.className='ghost-live-bar';
    bar.innerHTML='<strong>✏️ Live Edit</strong><button id="ghost-live-save">Saqlash va nashr</button><button id="ghost-live-cancel">Bekor qilish</button>';
    document.body.append(bar);
    $('#ghost-live-cancel',bar).onclick=()=>{for(const [el,text] of liveOriginal||[])el.textContent=text;disableLiveEdit();toast('Tahrir bekor qilindi');};
    $('#ghost-live-save',bar).onclick=async()=>{
      const button=$('#ghost-live-save',bar);button.disabled=true;
      try{
        const loaded=await action('data',{type:'profile'},'GET');const settings=loaded.data;
        for(const el of nodes){const key=el.dataset.ghostField;if(['hero_description','about_text'].includes(key))settings[key]=el.textContent.trim();}
        await action('save',{type:'profile',data:settings,sha:loaded.sha||null});
        disableLiveEdit();toast('Matn GitHub’ga nashr qilindi. Netlify deploy tugagach yangilanadi.');
      }catch(e){toast(e.message,true);button.disabled=false;}
    };
  }
  function disableLiveEdit(){document.querySelectorAll('[data-ghost-field]').forEach(el=>{el.contentEditable='false';el.classList.remove('ghost-editable');});document.getElementById('ghost-live-bar')?.remove();liveOriginal=null;}
  function init(){
    launch=document.createElement('button');launch.id='ghost-launch';launch.type='button';launch.textContent='>_';launch.setAttribute('aria-label','Terminal (5 marta bosish)');launch.title='Terminal';document.body.append(launch);
    overlay=document.createElement('div');overlay.id='ghost-overlay';overlay.hidden=true;overlay.innerHTML='<section id="ghost-shell" role="dialog" aria-modal="true" aria-label="Ghost Admin"><header class="ghost-top"><h2><span class="ghost-dots"><i></i><i></i><i></i></span> ergashev@dev:~</h2><button id="ghost-close" aria-label="Yopish">✕</button></header><div class="ghost-body" id="ghost-content"></div></section>';document.body.append(overlay);
    shell=$('#ghost-shell',overlay);main=$('#ghost-content',overlay);
    $('#ghost-close',overlay).onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    launch.onclick=()=>{const now=Date.now();if(now-lastClick>2800)clicks=0;lastClick=now;if(++clicks>=5){clicks=0;open();}};
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&!overlay.hidden){close();return;}
      const el=e.target;
      if(el instanceof Element && el.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(e.metaKey||e.ctrlKey||e.altKey||e.key.length!==1)return;
      typed=(typed+e.key.toUpperCase()).slice(-KEY.length);
      if(typed===KEY){typed='';open();}
    });
    // Visit/project telemetry lives in js/analytics.js (also usable without admin login).
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

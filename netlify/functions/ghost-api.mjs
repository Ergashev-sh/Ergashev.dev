/** Ergashev.dev • Netlify Ghost API
 * Browser never receives GitHub, stats or session secrets.
 * JSON content is shared with the EXISTING aiogram Telegram bot.
 */
import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const TYPES = Object.freeze({
  projects:'data/projects.json', blogs:'data/blogs.json',
  profile:'data/profile.json', design:'data/site-config.json', seo:'data/seo.json'
});
const AUTH_COOKIE='erg_ghost';
const OUT = (v,code=200,extra={})=>Response.json(v,{status:code,headers:{'cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const b64 = v=>Buffer.from(v).toString('base64');
const HASH=(value)=>createHmac('sha256',process.env.STATS_HASH_SECRET || process.env.SESSION_SECRET || 'missing-secret').update(value).digest('hex');
const HMAC=value=>createHmac('sha256',process.env.SESSION_SECRET).update(value).digest('hex');
const str=(v,max=1000)=>String(v??'').slice(0,max).trim();
const isHex=v=>/^#[a-f0-9]{6}$/i.test(v);
const isSafeLink=(v)=>!v || (/^https?:\/\//i.test(v) && (()=>{try {return ['https:','http:'].includes(new URL(v).protocol)}catch{return false}})());
const isImage=(v)=>!v || /^(assets\/uploads\/|\/assets\/uploads\/)[a-zA-Z0-9._/-]+$/.test(v) || isSafeLink(v);
const safe=(value,valid,msg)=>{if(!valid(value))throw Object.assign(new Error(msg),{status:400});return value};
const fail=(msg,code=400)=>Object.assign(new Error(msg),{status:code});

function cookie(req){return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(AUTH_COOKIE+'='))?.slice(AUTH_COOKIE.length+1)||'';}
function session(req){
  if(!process.env.SESSION_SECRET)return false;
  const [payload,signature]=cookie(req).split('.');
  if(!payload||!signature||!/^[0-9a-f]{64}$/.test(signature))return false;
  if(!timingSafeEqual(Buffer.from(HMAC(payload)),Buffer.from(signature)))return false;
  try{const p=JSON.parse(Buffer.from(payload,'base64url').toString());return p.scope==='admin' && p.exp>Date.now();}catch{return false;}
}
function statsAuthorized(req){
  if(session(req))return true;
  const secret=process.env.STATS_READ_TOKEN||'';
  const received=req.headers.get('authorization')||'';
  const provided=received.startsWith('Bearer ')?received.slice(7):'';
  return secret.length>=32 && provided.length===secret.length && timingSafeEqual(Buffer.from(provided),Buffer.from(secret));
}
function sameOrigin(req){
  const origin=req.headers.get('origin');
  if(!origin)return false;
  try {const o=new URL(origin),r=new URL(req.url);return o.host===r.host && ((o.protocol==='https:'&&r.protocol==='https:')||(o.hostname==='localhost'&&r.hostname==='localhost'));}catch{return false;}
}
function passwordOK(v){
  const [salt,expected]=(process.env.ADMIN_PASSWORD_HASH||'').split(':');
  if(!salt||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(expected||'')||typeof v!=='string'||v.length>256)return false;
  const hashed=scryptSync(v,Buffer.from(salt,'hex'),64);
  return timingSafeEqual(hashed,Buffer.from(expected,'hex'));
}
const newCookie=(value,maxAge)=>`${AUTH_COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
async function github(path,method='GET',input){
  if(!process.env.GITHUB_TOKEN||!process.env.GITHUB_OWNER||!process.env.GITHUB_REPO)throw fail('GitHub sozlanmagan',503);
  const owner=encodeURIComponent(process.env.GITHUB_OWNER),repo=encodeURIComponent(process.env.GITHUB_REPO);
  const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const branch=process.env.GITHUB_BRANCH||'main';
  const response=await fetch(method==='GET'?`${url}?ref=${encodeURIComponent(branch)}`:url,{
    method,headers:{'authorization':`Bearer ${process.env.GITHUB_TOKEN}`,'accept':'application/vnd.github+json',
      'x-github-api-version':'2022-11-28','content-type':'application/json'},
    body:input?JSON.stringify(input):undefined
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw fail(`GitHub: ${body.message||response.status}`,response.status);
  return body;
}
async function readFile(path){const obj=await github(path);return {raw:Buffer.from((obj.content||'').replace(/\s+/g,''),'base64').toString(),sha:obj.sha};}
async function writeFile(path,content,message,expectedSha=null){
  let sha;
  try{sha=(await readFile(path)).sha}catch(e){if(e.status!==404)throw e}
  if(expectedSha !== null && expectedSha !== sha)throw fail('GitHub kontenti o‘zgargan. Yangidan yuklab, tahrirni takrorlang.',409);
  return github(path,'PUT',{message,content:b64(content),sha,branch:process.env.GITHUB_BRANCH||'main'});
}
const textLimit={id:90,title:160,category:100,date:40,year:10,summary:700,description:7000,excerpt:700,body:13000,
  image:600,demo_url:600,github_url:600,avatar:600,site_title:140,hero_description:2000,about_text:5000,contact_url:600,glyph:14,theme:20};
function validate(type,data){
  if(type==='projects'||type==='blogs'){
    if(!Array.isArray(data)||data.length>200)throw fail('Ro‘yxatda ko‘pi bilan 200 ta yozuv bo‘lishi mumkin');
    const ids=new Set();return data.map(obj=>{
      if(!obj||typeof obj!=='object'||Array.isArray(obj))throw fail('Yozuv noto‘g‘ri');
      const row={};for(const [k,limit] of Object.entries(textLimit))if(k in obj)row[k]=str(obj[k],limit);
      row.id=str(obj.id,90);row.title=str(obj.title,160);
      if(!row.id||!row.title||ids.has(row.id))throw fail('ID / nom bo‘sh yoki takrorlangan');ids.add(row.id);
      row.tags=(Array.isArray(obj.tags)?obj.tags:[]).slice(0,15).map(x=>str(x,60));
      row.is_demo=Boolean(obj.is_demo);
      row.status=['published','draft','hidden','archived'].includes(obj.status)?obj.status:'published';
      if(type==='projects'){
        row.category=row.category||'Web';row.year=row.year||String(new Date().getUTCFullYear());row.glyph=row.glyph||'✳';row.theme=['lime','purple','blue','orange'].includes(row.theme)?row.theme:'blue';
        if(!isSafeLink(row.demo_url)||!isSafeLink(row.github_url)||!isImage(row.image))throw fail('Loyiha havolasi noto‘g‘ri');
      }else{row.category=row.category||'NOTES';row.date=row.date||new Date().toISOString().slice(0,10)}
      return row;
    });
  }
  if(!data||typeof data!=='object'||Array.isArray(data))throw fail('Sozlamalar formati noto‘g‘ri');
  if(type==='profile'){
    const row={};for(const k of ['site_title','hero_description','about_text','github_url','contact_url','avatar'])row[k]=str(data[k],textLimit[k]);
    for(const k of ['github_url','contact_url'])if(!isSafeLink(row[k]))throw fail(`${k} havolasi noto‘g‘ri`);
    if(!isImage(row.avatar))throw fail('Profil rasmi manzili noto‘g‘ri');
    return row;
  }
  if(type==='design'){
    const theme=str(data.theme,20);const accent=str(data.accent,7),accent2=str(data.accent2,7);
    if(!['teal','blue','purple','green','orange'].includes(theme)||!isHex(accent)||!isHex(accent2))throw fail('Rang kodi yoki tema noto‘g‘ri');
    const speed=Number(data.speed);if(!Number.isFinite(speed)||speed<0||speed>100)throw fail('Animatsiya tezligi 0—100');
    return {theme,accent,accent2,speed:Math.round(speed)};
  }
  if(type==='seo')return {title:str(data.title,160),description:str(data.description,300)};
  throw fail('Ma’lumot turi noto‘g‘ri');
}
const blobs=name=>getStore({name,consistency:'strong'});
async function log(action){try{await blobs('ghost-activity').setJSON(`item/${Date.now()}-${randomUUID()}`,{action,time:new Date().toISOString()});}catch(e){console.error('Activity:',e.message)}}
async function listAll(store,prefix,max=20000){
  const out=[];let partial=false;
  // Current @netlify/blobs returns an async iterator in paginated mode.
  for await (const page of store.list({prefix,paginate:true})) {
    for(const row of page.blobs||[]){if(out.length>=max){partial=true;break;}out.push(row.key)}
    if(partial)break;
  }
  return {keys:out,partial};
}
const dayInTashkent=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateOffset=(date,days)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
async function stats(){
  const store=blobs('erg-stats-v1');
  const [{keys:views,partial:pvSample},{keys:unique,partial:uSample},{keys:projects,partial:pcSample}]=await Promise.all([
    listAll(store,'view/'),listAll(store,'unique/'),listAll(store,'project/')
  ]);
  const today=dayInTashkent(),weekStart=dateOffset(today,-6),monthStart=today.slice(0,7)+'-01';
  const byDay=new Map(),allUnique=new Set();
  const addDay=day=>{if(!byDay.has(day))byDay.set(day,{date:day,views:0,visitors:0,projectClicks:0});return byDay.get(day)};
  const group={today:{views:0,visitors:0},week:{views:0,visitors:0},month:{views:0,visitors:0}};
  for(const key of views){const day=key.split('/')[1];if(day)addDay(day).views++}
  for(const key of projects){const day=key.split('/')[1];if(day)addDay(day).projectClicks++}
  const weekUnique=new Set(),monthUnique=new Set(),todayUnique=new Set();
  for(const key of unique){const [,day,hash]=key.split('/');if(!day||!hash)continue;addDay(day).visitors++;allUnique.add(hash);if(day===today)todayUnique.add(hash);if(day>=weekStart&&day<=today)weekUnique.add(hash);if(day>=monthStart&&day<=today)monthUnique.add(hash);}
  const rows=[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
  for(const row of rows){if(row.date===today)group.today.views+=row.views;if(row.date>=weekStart&&row.date<=today)group.week.views+=row.views;if(row.date>=monthStart&&row.date<=today)group.month.views+=row.views;}
  group.today.visitors=todayUnique.size;group.week.visitors=weekUnique.size;group.month.visitors=monthUnique.size;
  return {timezone:'Asia/Tashkent',asOf:today, today:group.today,week:group.week,month:group.month,
    total:{views:views.length,visitors:allUnique.size,projectClicks:projects.length},
    days:rows.filter(x=>x.date>=dateOffset(today,-29)&&x.date<=today),
    sampled:pvSample||uSample||pcSample,
    note:'Noyob tashrifchilar — brauzer identifikatorlari bo‘yicha taxminiy hisob. Sayt ishga tushganidan keyingi ma’lumotlar.'};
}
export default async req=>{
  try{
    const url=new URL(req.url),action=url.searchParams.get('action')||'';
    if(req.method==='GET'&&action==='session')return OUT({authenticated:session(req)});
    if(req.method==='POST'&&!sameOrigin(req))return OUT({error:'Origin tekshiruvi muvaffaqiyatsiz'},403);
    if(req.method==='POST'&&action==='login'){
      if(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<48||!process.env.ADMIN_PASSWORD_HASH)return OUT({error:'Netlify admin login hali sozlanmagan'},503);
      const ip=req.headers.get('x-nf-client-connection-ip')||'unknown';const limit=blobs('ghost-login');const key='attempt/'+HASH(ip);
      const attempts=await limit.get(key,{type:'json'})||{n:0,until:0};
      if(attempts.n>=5&&Date.now()<attempts.until)return OUT({error:'Ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.'},429);
      const body=await req.json().catch(()=>({}));if(!passwordOK(body.password)){
        const n=Date.now()<attempts.until?attempts.n+1:1;
        await limit.setJSON(key,{n,until:Date.now()+15*60_000});return OUT({error:'Parol noto‘g‘ri'},401);
      }
      await limit.delete(key);
      const data=Buffer.from(JSON.stringify({scope:'admin',exp:Date.now()+12*60*60_000})).toString('base64url');
      return OUT({ok:true},200,{'set-cookie':newCookie(data+'.'+HMAC(data),12*60*60)});
    }
    if(req.method==='POST'&&action==='logout')return OUT({ok:true},200,{'set-cookie':newCookie('',0)});
    if(req.method==='POST'&&action==='event'){
      const body=await req.json().catch(()=>({}));
      if(!['pageview','project'].includes(body.kind))return OUT({error:'Hodisa turi noto‘g‘ri'},400);
      if(!/^[a-zA-Z0-9-]{20,64}$/.test(body.visitor||''))return OUT({error:'Visitor ID noto‘g‘ri'},400);
      const today=dayInTashkent(),visitor=HASH(String(body.visitor));
      const store=blobs('erg-stats-v1');
      if(body.kind==='pageview'){
        await Promise.all([
          store.setJSON(`view/${today}/${randomUUID()}`,{t:Date.now()}),
          store.setJSON(`unique/${today}/${visitor}`,{t:Date.now()})
        ]);
      }else await store.setJSON(`project/${today}/${randomUUID()}`,{project:str(body.project,90)});
      return OUT({ok:true});
    }
    if(req.method==='GET'&&action==='stats'){
      if(!statsAuthorized(req))return OUT({error:'Statistika uchun ruxsat yo‘q'},401);
      return OUT(await stats());
    }
    if(!session(req))return OUT({error:'Admin login talab qilinadi'},401);
    if(req.method==='GET'&&action==='activity'){
      const result=await listAll(blobs('ghost-activity'),'item/',200);
      const selected=result.keys.sort().slice(-30).reverse();
      const entries=await Promise.all(selected.map(k=>blobs('ghost-activity').get(k,{type:'json'})));
      return OUT(entries.filter(Boolean));
    }
    if(req.method==='GET'&&action==='data'){
      const type=url.searchParams.get('type');if(!TYPES[type])throw fail('Noma’lum ma’lumot turi');
      try{const file=await readFile(TYPES[type]);return OUT({data:JSON.parse(file.raw),sha:file.sha})}
      catch(e){if(e.status===404)return OUT({data: ['projects','blogs'].includes(type)?[]:{},sha:null});throw e}
    }
    if(req.method==='GET'&&action==='draft'){
      const type=url.searchParams.get('type');if(!TYPES[type])throw fail('Noma’lum ma’lumot turi');
      return OUT({data:await blobs('ghost-drafts').get(type,{type:'json'}) || (['projects','blogs'].includes(type)?[]:{})});
    }
    if(req.method==='GET'&&action==='history'){
      const type=url.searchParams.get('type');if(!TYPES[type])throw fail('Noma’lum ma’lumot turi');
      if(!process.env.GITHUB_TOKEN)throw fail('GitHub sozlanmagan',503);
      const owner=encodeURIComponent(process.env.GITHUB_OWNER),repo=encodeURIComponent(process.env.GITHUB_REPO);
      const response=await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(TYPES[type])}&sha=${encodeURIComponent(process.env.GITHUB_BRANCH||'main')}&per_page=15`,{headers:{authorization:`Bearer ${process.env.GITHUB_TOKEN}`,accept:'application/vnd.github+json'}});
      if(!response.ok)throw fail('GitHub tarixini olishda xatolik',response.status);
      const commits=await response.json();return OUT(commits.map(v=>({sha:v.sha,message:v.commit.message,date:v.commit.author?.date})));
    }
    if(req.method==='POST'&&['draft','save'].includes(action)){
      const body=await req.json().catch(()=>({}));const type=body.type;if(!TYPES[type])throw fail('Noma’lum tur');
      if(JSON.stringify(body.data||{}).length>300000)throw fail('Ma’lumot hajmi katta',413);
      if(action==='draft'){await blobs('ghost-drafts').setJSON(type,body.data);await log('Qoralama: '+type);return OUT({ok:true});}
      const clean=validate(type,body.data);
      let written;
      if(Array.isArray(clean)){
        const drafts=clean.filter(v=>v.status!=='published');
        if(drafts.length)await blobs('ghost-drafts').setJSON(type,drafts);
        written=await writeFile(TYPES[type],JSON.stringify(clean.filter(v=>v.status==='published'),null,2)+'\n','Ghost Admin: publish '+type,body.sha??null);
      }else written=await writeFile(TYPES[type],JSON.stringify(clean,null,2)+'\n','Ghost Admin: update '+type,body.sha??null);
      await log('Nashr: '+type);return OUT({ok:true,sha:written.content?.sha||null,notice:'GitHub commit yaratildi; Netlify deploy qiladi.'});
    }
    if(req.method==='POST'&&action==='upload'){
      const form=await req.formData();const file=form.get('file');
      if(!file || typeof file.arrayBuffer !== 'function')throw fail('Rasmni tanlang');
      const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
      if(!extensions[file.type]||file.size>3*1024*1024||file.size<1)throw fail('JPG/PNG/WebP/GIF, 3 MB gacha');
      const path=`assets/uploads/${Date.now()}-${randomUUID().slice(0,8)}.${extensions[file.type]}`;
      await writeFile(path,Buffer.from(await file.arrayBuffer()),'Ghost Admin: image '+path);
      await log('Rasm: '+path);return OUT({ok:true,path});
    }
    if(req.method==='POST'&&action==='rollback'){
      const body=await req.json().catch(()=>({}));const {type,sha}=body;
      if(!TYPES[type]||!/^[a-f0-9]{40}$/.test(sha||''))throw fail('Versiya noto‘g‘ri');
      const owner=encodeURIComponent(process.env.GITHUB_OWNER),repo=encodeURIComponent(process.env.GITHUB_REPO);
      const response=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${TYPES[type]}?ref=${sha}`,{headers:{authorization:`Bearer ${process.env.GITHUB_TOKEN}`,accept:'application/vnd.github+json'}});
      if(!response.ok)throw fail('Tanlangan commitda fayl topilmadi',404);
      const content=await response.json(),raw=Buffer.from(content.content.replace(/\s/g,''),'base64').toString();
      validate(type,JSON.parse(raw));await writeFile(TYPES[type],raw,'Ghost Admin: restore '+type+' from '+sha.slice(0,8));
      await log('Tiklash: '+type+' '+sha.slice(0,8));return OUT({ok:true});
    }
    return OUT({error:'Amal topilmadi'},404);
  }catch(e){
    console.error('ghost-api',e.message);
    const code=[400,401,403,404,409,413,429,503].includes(e.status)?e.status:500;
    return OUT({error:code===500?'Serverda xatolik. Netlify Function logini tekshiring.':e.message},code);
  }
};

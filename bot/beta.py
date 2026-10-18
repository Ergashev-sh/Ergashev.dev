"""Ergashev.dev 2.0 beta: private admin workflows and Telegram Web App bridge."""
import io, json, os, re, uuid, zipfile, logging
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from aiogram import F
from aiogram.filters import Command
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo, BufferedInputFile

MAX_WEB_DATA=3900
WEB_URL=os.getenv('WEB_ADMIN_URL','https://ergashev-sh.github.io/Ergashev.dev/admin/')
DATA_PATHS=['data/projects.json','data/blogs.json','data/profile.json','data/site-config.json','data/commands.json']

class BetaInput(StatesGroup):
    command=State()
    avatar=State()
    restore=State()

def kb(*rows):
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=t,callback_data=c) for t,c in row] for row in rows])

def admin_kb():
    return kb([('🌐 Web Admin ochish','beta:web')],[('📂 Loyihalar','show:projects'),('📰 Blog','show:blogs')],[('👤 Avatar','beta:avatar'),('🎨 Dizayn','beta:design')],[('🧩 Buyruqlar','beta:commands'),('💾 Backup','beta:backup')],[('🔄 Tizim holati','beta:status'),('⬅️ 1.0 menyu','home')])

def web_keyboard():
    return ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text='🌐 Web Admin 2.0',web_app=WebAppInfo(url=WEB_URL))],[KeyboardButton(text='🏠 /start')]],resize_keyboard=True)

def valid_url(v):
    return not v or (isinstance(v,str) and len(v)<=500 and urlparse(v).scheme in ('http','https') and bool(urlparse(v).netloc))

def clean_text(v,n=3000):
    if not isinstance(v,str) or len(v)>n:raise ValueError('Matn uzunligi noto‘g‘ri')
    return v.strip()

async def save_web(store, obj):
    kind=obj.get('kind'); op=obj.get('op'); value=obj.get('value',{})
    if kind in ('projects','blogs'):
        if op not in ('create','update','delete','hide','publish'):raise ValueError('Amal noma’lum')
        if not isinstance(value,dict):raise ValueError('JSON obyekt kutilgan')
        key='data/'+kind+'.json'; ident=clean_text(value.get('id',''),100)
        if op!='create' and not ident:raise ValueError('ID kerak')
        if op in ('create','update'):
            title=clean_text(value.get('title',''),150)
            if not title:raise ValueError('Sarlavha kerak')
            for field in ('demo_url','github_url'):
                if not valid_url(value.get(field,'')):raise ValueError('Havola xato')
        def transform(items):
            pos=next((i for i,x in enumerate(items) if x.get('id')==ident),None)
            if op=='create':
                if kind=='projects':
                    x={'id':uuid.uuid4().hex[:12],'title':title,'category':clean_text(value.get('category','Web'),60),'summary':clean_text(value.get('summary',''),500),'description':clean_text(value.get('description',''),2500),'tags':[clean_text(x,40) for x in value.get('tags',[])[:10]],'github_url':value.get('github_url',''),'demo_url':value.get('demo_url',''),'date':datetime.now(timezone.utc).date().isoformat(),'year':str(datetime.now(timezone.utc).year),'status':value.get('status','published')}
                else:
                    x={'id':uuid.uuid4().hex[:12],'title':title,'excerpt':clean_text(value.get('excerpt',''),600),'body':clean_text(value.get('body',''),2500),'category':clean_text(value.get('category','Blog'),60),'date':datetime.now(timezone.utc).date().isoformat(),'status':value.get('status','published')}
                items.append(x)
            elif pos is None:raise ValueError('Yozuv topilmadi, qayta yuklang')
            elif op=='delete':items.pop(pos)
            elif op in ('hide','publish'):items[pos]['status']='hidden' if op=='hide' else 'published'
            else:
                allowed=('title','category','summary','description','tags','github_url','demo_url','excerpt','body','status')
                for field in allowed:
                    if field in value:
                        if field=='tags':items[pos][field]=[clean_text(t,40) for t in value[field][:10]]
                        else:items[pos][field]=clean_text(value[field],2500)
            return items
        await store.transform_list(key,transform,'admin 2.0: '+op+' '+kind)
        return '✅ '+kind+' — '+op+' bajarildi'
    if kind=='profile' and op=='update':
        allowed=('site_title','hero_description','about_text','github_url','contact_url')
        for field,v in value.items():
            if field not in allowed:raise ValueError('Maydon ruxsat etilmagan')
            if field.endswith('_url') and not valid_url(v):raise ValueError('Havola xato')
            await store.update_profile(field,clean_text(v,2000))
        return '✅ Profil yangilandi'
    if kind=='design' and op=='update':
        theme=clean_text(value.get('theme','blue'),20)
        if theme not in ('blue','purple','green'):raise ValueError('Mavzu noto‘g‘ri')
        speed=int(value.get('speed',60))
        if not 0<=speed<=100:raise ValueError('Tezlik 0–100')
        await store._put('data/site-config.json',(json.dumps({'theme':theme,'speed':speed},indent=2)+'\n').encode(),'admin 2.0: theme')
        return '✅ Sayt mavzusi saqlandi'
    raise ValueError('Noma’lum modul yoki amal')

def register_beta(router,get_store,allow,menu):
    @router.callback_query(F.data=='beta:home')
    async def beta_home(c):
        await c.answer()
        if not allow(c.from_user):return
        await c.message.answer('🚀 <b>ERGASHEV.DEV — PRO MAX 2.0 BETA</b>\n\nBoshqaruv modulini tanlang:',reply_markup=admin_kb())

    @router.callback_query(F.data=='beta:web')
    async def beta_web(c):
        await c.answer()
        if not allow(c.from_user):return
        await c.message.answer('🌐 Pastdagi <b>Web Admin 2.0</b> klaviatura tugmasini bosing. Telegram ichida oching.\n\nBot o‘chiq bo‘lsa saqlash ishlamaydi.',reply_markup=web_keyboard())

    @router.message(F.web_app_data)
    async def web_data(m):
        if not allow(m.from_user):return await m.answer('⛔ Admin huquqi yo‘q')
        raw=m.web_app_data.data
        if len(raw.encode())>MAX_WEB_DATA:return await m.answer('❌ Ma’lumot hajmi katta. 3900 baytdan kichik yuboring.')
        try:
            obj=json.loads(raw)
            if not isinstance(obj,dict):raise ValueError('Noto‘g‘ri ma’lumot')
            result=await save_web(get_store(),obj)
            await m.answer(result,reply_markup=admin_kb())
        except Exception as ex:
            logging.exception('Web admin save failed')
            await m.answer('❌ Saqlanmadi: '+str(ex)[:250])

    @router.callback_query(F.data=='beta:status')
    async def status(c):
        await c.answer()
        if not allow(c.from_user):return
        s=get_store()
        try:
            data=await s.read_json('data/projects.json',[])
            blogs=await s.read_json('data/blogs.json',[])
            await c.message.answer(f'🟢 Bot ishlayapti\n🟢 GitHub API javob berdi\n📂 Loyihalar: {len(data)}\n📰 Maqolalar: {len(blogs)}\n🔐 Tokenlar lokal saqlanadi.',reply_markup=admin_kb())
        except Exception as ex:await c.message.answer('🔴 GitHub tekshiruvi muvaffaqiyatsiz: '+str(ex)[:160])

    @router.callback_query(F.data=='beta:backup')
    async def backup(c):
        await c.answer()
        if not allow(c.from_user):return
        try:
            out=io.BytesIO()
            with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
                for path in DATA_PATHS:
                    default=[] if path.endswith(('projects.json','blogs.json','commands.json')) else {}
                    data=await get_store().read_json(path,default)
                    z.writestr(path,json.dumps(data,ensure_ascii=False,indent=2))
            await c.message.answer_document(BufferedInputFile(out.getvalue(),filename='ergashev-backup-'+datetime.now().strftime('%Y%m%d-%H%M')+'.zip'),caption='💾 Zaxira nusxa. Bu faylni maxfiy saqlang.')
            await c.message.answer('Qayta tiklash uchun /restore buyrug‘ini bosing. ⚠️ Joriy ma’lumotlar ustidan yoziladi.')
        except Exception as ex:await c.message.answer('❌ Backup xatosi: '+str(ex)[:200])

    @router.message(Command('restore'))
    async def restore_start(m,state):
        if not allow(m.from_user):return
        await state.set_state(BetaInput.restore)
        await m.answer('💾 Zaxira ZIP faylni yuboring. Tiklashdan oldin yana tasdiqlash so‘raladi. /cancel — bekor qilish.')

    @router.message(BetaInput.restore)
    async def restore_file(m,state,bot):
        if not allow(m.from_user):return
        if not m.document or not m.document.file_name.lower().endswith('.zip') or m.document.file_size>2_000_000:
            return await m.answer('2 MB dan kichik ZIP yuboring.')
        file=await bot.get_file(m.document.file_id)
        b=io.BytesIO();await bot.download_file(file.file_path,b)
        try:
            with zipfile.ZipFile(io.BytesIO(b.getvalue())) as z:
                entries={}
                for path in DATA_PATHS:
                    if path in z.namelist():
                        info=z.getinfo(path)
                        if info.file_size>300_000:raise ValueError('Fayl juda katta')
                        value=json.loads(z.read(path))
                        if not isinstance(value,list if path.endswith(('projects.json','blogs.json','commands.json')) else dict):raise ValueError('JSON turi xato')
                        entries[path]=value
                if not entries:raise ValueError('Backup fayllari topilmadi')
            await state.update_data(restore_data=entries)
            await m.answer('⚠️ '+str(len(entries))+' ta fayl tiklanadi. Hozirgi ma’lumotlar almashadi!',reply_markup=kb([('♻️ Tasdiqlash','beta:restore:yes'),('❌ Bekor','beta:restore:no')]))
        except Exception as ex:await m.answer('❌ Backup noto‘g‘ri: '+str(ex)[:150])

    @router.callback_query(F.data.startswith('beta:restore:'))
    async def restore_confirm(c,state):
        await c.answer()
        if not allow(c.from_user):return
        if c.data.endswith(':no'):
            await state.clear();return await c.message.answer('Bekor qilindi')
        data=(await state.get_data()).get('restore_data')
        if not data:return await c.message.answer('Tiklash seansi topilmadi')
        try:
            for path,value in data.items():
                await get_store()._put(path,(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode(),'admin 2.0: restore backup')
            await state.clear();await c.message.answer('✅ Zaxira tiklandi. Sayt yangilanishini kuting.')
        except Exception as ex:await c.message.answer('❌ Qisman tiklangan bo‘lishi mumkin: '+str(ex)[:170])

    @router.callback_query(F.data=='beta:avatar')
    async def avatar(c,state):
        await c.answer()
        if not allow(c.from_user):return
        await state.set_state(BetaInput.avatar)
        await c.message.answer('📸 Profil rasmingizni <b>foto</b> sifatida yuboring. Bot uni GitHub’ga saqlaydi. /cancel — bekor qilish.')

    @router.message(BetaInput.avatar)
    async def avatar_photo(m,state,bot):
        if not allow(m.from_user):return
        if not m.photo:return await m.answer('📸 Rasm yuboring (foto sifatida).')
        try:
            f=await bot.get_file(m.photo[-1].file_id)
            b=io.BytesIO();await bot.download_file(f.file_path,b)
            if b.tell()>4_000_000:raise ValueError('Rasm 4 MB dan katta')
            path=await get_store().upload_image(b.getvalue(),'profile-'+uuid.uuid4().hex[:10]+'.jpg')
            await get_store().update_profile('avatar',path)
            await state.clear();await m.answer('✅ Profil rasmi GitHub’ga saqlandi. Sayt yangilanishini kuting.',reply_markup=admin_kb())
        except Exception as ex:await m.answer('❌ Rasm xatosi: '+str(ex)[:180])

    @router.callback_query(F.data=='beta:design')
    async def design(c):
        await c.answer()
        if not allow(c.from_user):return
        await c.message.answer('🎨 Ranglar va animatsiya tezligini Web Admin → Dizayn bo‘limida tanlang.',reply_markup=kb([('🌐 Web Admin','beta:web')],[('⬅️ Orqaga','beta:home')]))

    @router.callback_query(F.data=='beta:commands')
    async def commands(c):
        await c.answer()
        if not allow(c.from_user):return
        data=await get_store().read_json('data/commands.json',[])
        listing='\n'.join('/'+x['name']+' — '+x.get('reply','')[:55] for x in data[:25]) or 'Hali buyruq yo‘q.'
        await c.message.answer('🧩 <b>Maxsus buyruqlar</b>\n'+listing+'\n\nYangi buyruq yaratish uchun /newcommand',reply_markup=admin_kb())

    @router.message(Command('newcommand'))
    async def new_command(m,state):
        if not allow(m.from_user):return
        await state.set_state(BetaInput.command)
        await m.answer('🧩 Format: <code>buyruq | javob matni</code>\nMasalan: <code>portfolio | Mening saytim: https://...</code>\n/cancel — bekor qilish.')

    @router.message(BetaInput.command)
    async def command_save(m,state):
        if not allow(m.from_user):return
        parts=(m.text or '').split('|',1)
        if len(parts)!=2:return await m.answer('Format: buyruq | javob')
        name=parts[0].strip().lstrip('/').lower();reply=parts[1].strip()
        if not re.fullmatch('[a-z][a-z0-9_]{1,30}',name) or len(reply)>1000 or not reply:return await m.answer('Buyruq nomi yoki javob xato.')
        reserved={'start','cancel','restore','newcommand','help','web','status','stats','today','week','month'}
        if name in reserved:return await m.answer('Bu tizim buyrug‘i band.')
        def action(items):
            if any(x.get('name')==name for x in items):raise ValueError('Buyruq mavjud')
            items.append({'name':name,'reply':reply});return items
        try:
            await get_store().transform_list('data/commands.json',action,'admin 2.0: new command')
            await state.clear();await m.answer('✅ /'+name+' yaratildi. Botga yozib sinab ko‘ring.')
        except Exception as ex:await m.answer('❌ '+str(ex)[:180])

    @router.message(Command('delcommand'))
    async def delete_command(m):
        if not allow(m.from_user):return
        parts=(m.text or '').split(maxsplit=1)
        if len(parts)<2:return await m.answer('Foydalanish: /delcommand portfolio')
        name=parts[1].strip().lstrip('/').lower()
        if not re.fullmatch('[a-z][a-z0-9_]{1,30}',name):return await m.answer('Buyruq nomi xato')
        def remove(items):
            if not any(x.get('name')==name for x in items):raise ValueError('Buyruq topilmadi')
            return [x for x in items if x.get('name')!=name]
        try:
            await get_store().transform_list('data/commands.json',remove,'admin 2.0: delete command')
            await m.answer('✅ /'+name+' o‘chirildi')
        except Exception as ex:await m.answer('❌ '+str(ex)[:160])

    @router.message(F.text.regexp(r'^/[a-z][a-z0-9_]{1,30}(?:@\w+)?$'))
    async def dynamic_command(m):
        if not allow(m.from_user):return
        name=m.text.split('@')[0][1:]
        items=await get_store().read_json('data/commands.json',[])
        item=next((x for x in items if x.get('name')==name),None)
        if item:await m.answer(item['reply'])

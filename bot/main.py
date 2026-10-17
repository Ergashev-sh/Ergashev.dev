"""Ergashev.dev — on-demand Telegram admin bot (aiogram 3).

Start ONLY when editing. Publishes projects/blog/profile JSON and images
into GitHub Pages repository. The public website never needs this bot online.
"""
import asyncio
import html
import io
import logging
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from dotenv import load_dotenv

from storage import GitHubStore
from beta import register_beta

load_dotenv(Path(__file__).resolve().parent.parent / '.env')
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
ADMIN_IDS = {int(v.strip()) for v in os.getenv('ADMIN_IDS', '').split(',') if v.strip().isdigit()}
CHANNEL_ID = os.getenv('CHANNEL_ID', '').strip()
store: GitHubStore | None = None
router = Router()


class NewProject(StatesGroup):
    title = State()
    category = State()
    summary = State()
    description = State()
    tags = State()
    demo_url = State()
    github_url = State()
    image = State()


class NewBlog(StatesGroup):
    title = State()
    excerpt = State()
    body = State()


class EditValue(StatesGroup):
    value = State()


def h(value):
    return html.escape(str(value or ''))


def allow(user):
    return bool(user and user.id in ADMIN_IDS)


def keyboard(*rows):
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=label, callback_data=data) for label, data in row]
        for row in rows
    ])


def menu():
    return keyboard(
        [('➕ Loyiha qo‘shish', 'add:project'), ('📂 Loyihalar', 'show:projects')],
        [('✍️ Maqola yozish', 'add:blog'), ('📚 Blog', 'show:blogs')],
        [('👤 Profil sozlamalari', 'show:profile')],
        [('🚀 Pro Max 2.0', 'beta:home')],
    )


def categories():
    return keyboard([('🌐 Web', 'cat:Web'), ('🤖 Telegram bot', 'cat:Telegram bot')],
                    [('💻 Dastur', 'cat:Dastur')], [('❌ Bekor qilish', 'cancel')])


def back():
    return keyboard([('⬅️ Bosh menyu', 'home')])


async def forbidden(m: Message):
    await m.answer('⛔ Siz bu bot admini emassiz.')


async def text_or_error(message: Message, max_length=1500):
    text = (message.text or '').strip()
    if not text:
        await message.answer('Iltimos, matn yuboring.')
        return None
    if len(text) > max_length:
        await message.answer(f'Matn juda uzun. Chegara: {max_length} belgi.')
        return None
    return text


def check_link(value):
    if value in ('-', '/skip', 'yoq', 'yo‘q'):
        return ''
    if value.startswith('https://') or value.startswith('http://'):
        return value
    return None


async def archive(bot: Bot, title: str, description: str, photo_file_id=''):
    """Channel is optional: a private archive, NOT a live frontend database."""
    if not CHANNEL_ID:
        return
    try:
        note = f'📌 <b>{h(title)}</b>\n\n{h(description[:2900])}\n\n#ergashevdev'
        if photo_file_id:
            # Telegram file_id lets us archive the same image without reuploading.
            await bot.send_photo(CHANNEL_ID, photo=photo_file_id, caption=note[:1024])
        else:
            await bot.send_message(CHANNEL_ID, note)
    except Exception:
        logging.exception('Kanalga arxivlash amalga oshmadi; GitHub versiyasi saqlangan')


@router.message(Command('start'))
async def start(m: Message, state: FSMContext):
    if not allow(m.from_user):
        await forbidden(m)
        return
    await state.clear()
    await m.answer('✳️ <b>ERGASHEV.DEV / ADMIN</b>\n\nSaytni tahrirlashga tayyor!\nBot o‘chirilgandan keyin ham sayt GitHub Pages orqali ochiq turadi.', reply_markup=menu())


@router.message(Command('cancel'))
async def cancel_message(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    await state.clear()
    await m.answer('❎ Bekor qilindi.', reply_markup=menu())


@router.callback_query(F.data == 'cancel')
async def cancel_cb(cb: CallbackQuery, state: FSMContext):
    await cb.answer()
    if not allow(cb.from_user): return
    await state.clear()
    await cb.message.answer('❎ Bekor qilindi.', reply_markup=menu())


@router.callback_query(F.data == 'home')
async def home(cb: CallbackQuery, state: FSMContext):
    await cb.answer()
    if not allow(cb.from_user): return
    await state.clear()
    await cb.message.answer('🏠 <b>Boshqaruv markazi</b>', reply_markup=menu())


@router.callback_query(F.data == 'add:project')
async def start_project(cb: CallbackQuery, state: FSMContext):
    await cb.answer()
    if not allow(cb.from_user): return
    await state.clear()
    await state.set_state(NewProject.title)
    await cb.message.answer('➕ <b>Yangi loyiha</b>\n\n1/8 — Loyiha nomini yuboring.\nBekor qilish: /cancel')


@router.message(NewProject.title)
async def project_title(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value = await text_or_error(m, 100)
    if not value: return
    await state.update_data(title=value)
    await state.set_state(NewProject.category)
    await m.answer('2/8 — Loyiha turini tanlang:', reply_markup=categories())


@router.callback_query(NewProject.category, F.data.startswith('cat:'))
async def project_category(cb: CallbackQuery, state: FSMContext):
    await cb.answer()
    if not allow(cb.from_user): return
    await state.update_data(category=cb.data[4:])
    await state.set_state(NewProject.summary)
    await cb.message.answer('3/8 — Qisqa tavsif yozing (1–2 gap).')


@router.message(NewProject.summary)
async def project_summary(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value = await text_or_error(m, 300)
    if not value: return
    await state.update_data(summary=value)
    await state.set_state(NewProject.description)
    await m.answer('4/8 — Batafsil tavsif yozing.')


@router.message(NewProject.description)
async def project_description(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value = await text_or_error(m, 2500)
    if not value: return
    await state.update_data(description=value)
    await state.set_state(NewProject.tags)
    await m.answer('5/8 — Texnologiyalarni vergul bilan yozing.\nMasalan: <code>Python, aiogram, GitHub</code>')


@router.message(NewProject.tags)
async def project_tags(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value = await text_or_error(m, 300)
    if not value: return
    await state.update_data(tags=[x.strip() for x in value.split(',') if x.strip()][:8])
    await state.set_state(NewProject.demo_url)
    await m.answer('6/8 — Demo havolasini yuboring (https://...) yoki <code>/skip</code> deb yozing.')


@router.message(NewProject.demo_url)
async def project_demo(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value = check_link((m.text or '').strip().lower() if (m.text or '').strip().lower() in ('/skip','-','yoq','yo‘q') else (m.text or '').strip())
    if value is None:
        await m.answer('Havola http:// yoki https:// bilan boshlanishi kerak. O‘tkazish uchun /skip')
        return
    await state.update_data(demo_url=value)
    await state.set_state(NewProject.github_url)
    await m.answer('7/8 — GitHub havolasini yuboring yoki <code>/skip</code>.')


@router.message(NewProject.github_url)
async def project_github(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value = check_link((m.text or '').strip().lower() if (m.text or '').strip().lower() in ('/skip','-','yoq','yo‘q') else (m.text or '').strip())
    if value is None:
        await m.answer('Havola http:// yoki https:// bilan boshlanishi kerak. O‘tkazish uchun /skip')
        return
    await state.update_data(github_url=value)
    await state.set_state(NewProject.image)
    await m.answer('8/8 — Loyiha rasmi (photo) yuboring yoki <code>/skip</code>.\nRasmni GitHub’ga joylaymiz — bot o‘chiq bo‘lsa ham ko‘rinadi.')


async def github_photo(bot: Bot, photo):
    buf = io.BytesIO()
    await bot.download(photo, destination=buf)
    filename = uuid.uuid4().hex[:16] + '.jpg'
    return await store.upload_image(buf.getvalue(), filename)


@router.message(NewProject.image)
async def project_save(m: Message, state: FSMContext, bot: Bot):
    if not allow(m.from_user): return
    if not m.photo and (m.text or '').strip() not in ('/skip', '-', 'yoq', 'yo‘q'):
        await m.answer('Rasm yuboring yoki /skip yozing.')
        return
    await m.answer('⏳ GitHub’ga saqlanmoqda...')
    data = await state.get_data()
    try:
        img = await github_photo(bot, m.photo[-1]) if m.photo else ''
        category = data['category']
        item = {
            'id': uuid.uuid4().hex[:12], 'title': data['title'], 'category': category,
            'year': str(datetime.now().year), 'glyph': {'Web':'</>', 'Telegram bot':'BOT', 'Dastur':'{ }'}.get(category,'✳'),
            'theme': {'Web':'lime', 'Telegram bot':'purple', 'Dastur':'blue'}.get(category,'orange'),
            'image': img, 'summary': data['summary'], 'description': data['description'],
            'tags': data['tags'], 'demo_url': data['demo_url'], 'github_url': data['github_url'], 'is_demo': False,
        }
        await store.transform_list('data/projects.json', lambda items: [item] + items, f'admin: add project {item["title"][:45]}')
        await archive(bot, f'Yangi loyiha: {item["title"]}', item['description'], m.photo[-1].file_id if m.photo else '')
        await state.clear()
        await m.answer(f'✅ <b>{h(item["title"])}</b> GitHub’ga joylandi!\n\nGitHub Pages deploy tugagach saytda ko‘rinadi.', reply_markup=menu())
    except Exception as ex:
        logging.exception('Failed saving project')
        await m.answer(f'❌ Saqlashda xato: <code>{h(str(ex)[:250])}</code>\nQayta urinish uchun rasm yoki /skip yuboring.')


@router.callback_query(F.data == 'add:blog')
async def start_blog(cb: CallbackQuery, state: FSMContext):
    await cb.answer()
    if not allow(cb.from_user): return
    await state.clear()
    await state.set_state(NewBlog.title)
    await cb.message.answer('✍️ <b>Yangi maqola</b>\n\n1/3 — Sarlavha yuboring. /cancel — bekor qilish.')


@router.message(NewBlog.title)
async def blog_title(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value=await text_or_error(m,140)
    if not value:return
    await state.update_data(title=value)
    await state.set_state(NewBlog.excerpt)
    await m.answer('2/3 — Qisqa tavsif yuboring.')


@router.message(NewBlog.excerpt)
async def blog_excerpt(m: Message, state: FSMContext):
    if not allow(m.from_user): return
    value=await text_or_error(m,250)
    if not value:return
    await state.update_data(excerpt=value)
    await state.set_state(NewBlog.body)
    await m.answer('3/3 — Maqolaning to‘liq matnini yuboring (4000 belgigacha).')


@router.message(NewBlog.body)
async def blog_body(m: Message, state: FSMContext, bot: Bot):
    if not allow(m.from_user): return
    value=await text_or_error(m,4000)
    if not value:return
    data=await state.get_data()
    item={'id':uuid.uuid4().hex[:12], 'title':data['title'],'excerpt':data['excerpt'],'body':value,
          'date':datetime.now().strftime('%Y-%m-%d'),'category':'NOTES','is_demo':False}
    try:
        await store.transform_list('data/blogs.json',lambda items:[item]+items,f'admin: add article {item["title"][:45]}')
        await archive(bot, f'Maqola: {item["title"]}', value)
        await state.clear()
        await m.answer('✅ Maqola saqlandi! GitHub Pages yangilangach saytda chiqadi.',reply_markup=menu())
    except Exception as ex:
        logging.exception('Failed saving article')
        await m.answer('❌ GitHub xatosi: '+h(str(ex)[:200]))


async def show_list(cb: CallbackQuery, kind: str):
    if not allow(cb.from_user):return
    path='data/projects.json' if kind=='projects' else 'data/blogs.json'
    items=await store.read_json(path,[])
    title='📂 Loyihalar' if kind=='projects' else '📚 Blog maqolalar'
    if not items:
        await cb.message.answer(title+'\n\nRo‘yxat bo‘sh.',reply_markup=back())
        return
    prefix='p' if kind=='projects' else 'b'
    rows=[[(f'{i+1:02}. {str(item.get("title",""))[:31]}',f'{prefix}:{item["id"]}')] for i,item in enumerate(items[:50])]
    rows.append([('⬅️ Bosh menyu','home')])
    await cb.message.answer(f'<b>{title}</b> — {len(items)} ta\nO‘zgartirish uchun birini tanlang:',reply_markup=keyboard(*rows))


@router.callback_query(F.data.in_({'show:projects','show:blogs'}))
async def list_callback(cb: CallbackQuery):
    await cb.answer()
    try:await show_list(cb, 'projects' if cb.data=='show:projects' else 'blogs')
    except Exception as ex:
        logging.exception('Read list failed')
        await cb.message.answer('❌ GitHub bilan aloqa xatosi: '+h(str(ex)[:160]))


@router.callback_query(F.data.startswith(('p:','b:')))
async def detail(cb: CallbackQuery):
    await cb.answer()
    if not allow(cb.from_user):return
    kind,id=cb.data.split(':',1)
    data=await store.read_json('data/projects.json' if kind=='p' else 'data/blogs.json',[])
    item=next((x for x in data if x['id']==id),None)
    if not item:
        await cb.message.answer('Bu yozuv topilmadi.')
        return
    await cb.message.answer(f'<b>{h(item["title"])}</b>\n\n{h(item.get("summary",item.get("excerpt","")))}',reply_markup=keyboard(
        [('✏️ Tahrirlash', f'edit:{kind}:{id}')],
        [('🗑 O‘chirish',f'delete:{kind}:{id}')],
        [('⬅️ Ro‘yxat','show:projects' if kind=='p' else 'show:blogs')]))


PROJECT_FIELDS={'title':'Nomi','summary':'Qisqa tavsif','description':'Batafsil tavsif','tags':'Texnologiyalar','demo_url':'Demo havolasi','github_url':'GitHub havolasi','category':'Turi','image':'Muqova rasmi'}
BLOG_FIELDS={'title':'Sarlavha','excerpt':'Qisqa tavsif','body':'Maqola matni'}
PROFILE_FIELDS={'hero_description':'Asosiy sahifa tavsifi','about_text':'Men haqimda','contact_url':'Aloqa havolasi','github_url':'GitHub havolasi'}


@router.callback_query(F.data.startswith('edit:'))
async def edit_menu(cb: CallbackQuery):
    await cb.answer()
    if not allow(cb.from_user):return
    _,kind,id=cb.data.split(':',2)
    fields=PROJECT_FIELDS if kind=='p' else BLOG_FIELDS
    rows=[[(label, f'field:{kind}:{id}:{field}')] for field,label in fields.items()]
    rows.append([('⬅️ Bosh menyu','home')])
    await cb.message.answer('✏️ Qaysi maydonni tahrirlaymiz?',reply_markup=keyboard(*rows))


@router.callback_query(F.data.startswith('field:'))
async def choose_field(cb: CallbackQuery, state: FSMContext):
    await cb.answer()
    if not allow(cb.from_user):return
    _,kind,id,field=cb.data.split(':',3)
    fields=PROJECT_FIELDS if kind=='p' else BLOG_FIELDS
    if field not in fields:return
    await state.clear()
    await state.update_data(edit_kind=kind,edit_id=id,edit_field=field)
    await state.set_state(EditValue.value)
    hint='Foto yuboring.' if field=='image' else ('Vergul bilan ajrating.' if field=='tags' else 'Yangi qiymatni matn sifatida yuboring.')
    await cb.message.answer(f'✏️ <b>{h(fields[field])}</b>\n{hint}\nBekor qilish: /cancel')


@router.message(EditValue.value)
async def write_field(m: Message, state: FSMContext, bot: Bot):
    if not allow(m.from_user):return
    data=await state.get_data()
    kind,id,field=data['edit_kind'],data['edit_id'],data['edit_field']
    if field=='image':
        if not m.photo:
            await m.answer('Foto yuboring.');return
        try:value=await github_photo(bot,m.photo[-1])
        except Exception as ex:
            await m.answer('❌ Rasmni joylashda xato: '+h(str(ex)[:160]));return
    else:
        value=await text_or_error(m,4000)
        if not value:return
        if field=='tags':value=[x.strip() for x in value.split(',') if x.strip()][:8]
        if field=='category' and value not in ('Web','Telegram bot','Dastur'):
            await m.answer('Turi Web, Telegram bot yoki Dastur bo‘lishi kerak.');return
        if field in ('demo_url','github_url'):
            value=check_link(value)
            if value is None:
                await m.answer('Havola https:// bilan boshlanishi kerak (yoki /skip).');return
    path='data/projects.json' if kind=='p' else 'data/blogs.json'
    found=False
    def replace(items):
        nonlocal found
        for item in items:
            if item['id']==id:
                item[field]=value
                item['is_demo']=False
                found=True
        return items
    try:
        await store.transform_list(path,replace,f'admin: update {kind} {id} {field}')
        await state.clear()
        await m.answer('✅ Saqlandi!' if found else '⚠️ Yozuv topilmadi.',reply_markup=menu())
    except Exception as ex:
        logging.exception('Edit failed')
        await m.answer('❌ Xato: '+h(str(ex)[:200]))


@router.callback_query(F.data.startswith('delete:'))
async def ask_delete(cb: CallbackQuery):
    await cb.answer()
    if not allow(cb.from_user):return
    _,kind,id=cb.data.split(':',2)
    await cb.message.answer('⚠️ Bu yozuvni saytdan olib tashlaysizmi?\nGithub tarixidan qayta tiklash mumkin.',reply_markup=keyboard(
        [('✅ Ha, o‘chirish',f'yesdel:{kind}:{id}')], [('❎ Yo‘q', 'home')]))


@router.callback_query(F.data.startswith('yesdel:'))
async def do_delete(cb: CallbackQuery):
    await cb.answer()
    if not allow(cb.from_user):return
    _,kind,id=cb.data.split(':',2)
    path='data/projects.json' if kind=='p' else 'data/blogs.json'
    try:
        await store.transform_list(path,lambda items:[x for x in items if x['id']!=id],f'admin: delete {kind} {id}')
        await cb.message.answer('✅ Saytdan olib tashlandi. GitHub Pages yangilangach yo‘qoladi.',reply_markup=menu())
    except Exception as ex:
        await cb.message.answer('❌ Xato: '+h(str(ex)[:200]))


@router.callback_query(F.data == 'show:profile')
async def profile_menu(cb: CallbackQuery):
    await cb.answer()
    if not allow(cb.from_user):return
    await cb.message.answer('👤 <b>Profil sozlamalari</b>\n\nQaysi joyni o‘zgartiramiz?',reply_markup=keyboard(
        *[[(label,'pf:'+field)] for field,label in PROFILE_FIELDS.items()],
        [('⬅️ Bosh menyu','home')]))


@router.callback_query(F.data.startswith('pf:'))
async def profile_field(cb: CallbackQuery, state: FSMContext):
    await cb.answer()
    if not allow(cb.from_user):return
    field=cb.data[3:]
    if field not in PROFILE_FIELDS:return
    await state.clear()
    await state.update_data(edit_kind='profile',edit_field=field)
    await state.set_state(EditValue.value)
    await cb.message.answer(f'✍️ <b>{h(PROFILE_FIELDS[field])}</b>\nYangi matn yoki havolani yuboring. /cancel — bekor qilish.')


# Separate state filter for profile edits, same EditValue.value state as project edits.
# The final dispatching handler below must be registered BEFORE the generic one.
async def profile_edit_middleware(handler, event, data):
    # Intercept a generic EditValue.value message if kind=profile.
    if isinstance(event, Message) and data.get('state'):
        state=data['state']
        if await state.get_state()==EditValue.value.state:
            current=await state.get_data()
            if current.get('edit_kind')=='profile':
                if not allow(event.from_user):return
                value=await text_or_error(event,2000)
                if not value:return
                field=current['edit_field']
                if field in ('contact_url','github_url') and check_link(value) is None:
                    await event.answer('http:// yoki https:// bilan boshlanadigan havola kiriting.');return
                try:
                    await store.update_profile(field,value)
                    await state.clear()
                    await event.answer('✅ Profil yangilandi!',reply_markup=menu())
                except Exception as ex:
                    await event.answer('❌ Xato: '+h(str(ex)[:200]))
                return
    return await handler(event,data)


register_beta(router, lambda: store, allow, menu)

@router.message()
async def other_messages(m: Message):
    if not allow(m.from_user):
        await forbidden(m)
    else:
        await m.answer('Boshqaruv uchun /start bosing. Yoki joriy jarayonni /cancel bilan bekor qiling.',reply_markup=menu())


async def main():
    global store
    required=['BOT_TOKEN','GH_OWNER','GH_REPO','GH_TOKEN','ADMIN_IDS']
    missing=[k for k in required if not os.getenv(k,'').strip()]
    if missing:
        raise RuntimeError('Missing .env settings: '+', '.join(missing))
    if not ADMIN_IDS:
        raise RuntimeError('ADMIN_IDS must include your numeric Telegram user ID')
    store=GitHubStore()
    dp=Dispatcher()
    router.message.outer_middleware(profile_edit_middleware)
    dp.include_router(router)
    bot=Bot(token=os.environ['BOT_TOKEN'],default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    try:
        print('🤖 Ergashev.dev admin bot started. Press Ctrl+C when done editing.')
        await dp.start_polling(bot)
    finally:
        await bot.session.close()
        await store.close()


if __name__=='__main__':
    asyncio.run(main())

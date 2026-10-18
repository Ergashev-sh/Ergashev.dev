"""Read the SAME site statistics the Ghost Admin sees. Never exposes a secret to browsers."""
import os
from datetime import datetime
import httpx

async def get_statistics():
    # Read variables after bot/main.py has loaded the .env file.
    API_URL = os.getenv('STATS_API_URL', 'https://ergashevdev.netlify.app/.netlify/functions/ghost-api').strip()
    TOKEN = os.getenv('STATS_READ_TOKEN', '').strip()
    if not TOKEN or len(TOKEN) < 32:
        raise RuntimeError('STATS_READ_TOKEN .env faylida sozlanmagan (kamida 32 belgi)')
    if not API_URL.startswith('https://'):
        raise RuntimeError('STATS_API_URL HTTPS bilan boshlanishi kerak')
    async with httpx.AsyncClient(timeout=25.0, follow_redirects=False) as client:
        response = await client.get(API_URL, params={'action': 'stats'},
                                    headers={'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/json'})
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or 'today' not in payload:
            raise ValueError('Statistika serveridan noto‘g‘ri javob')
        return payload


def pretty(v):
    return format(int(v or 0), ',').replace(',', ' ')


def report(data, period='all'):
    stamp = str(data.get('asOf', datetime.now().strftime('%Y-%m-%d')))
    periods = {
        'today': ('📅 BUGUN', data.get('today') or {}),
        'week': ('🗓 OXIRGI 7 KUN', data.get('week') or {}),
        'month': ('📆 JORIY OY', data.get('month') or {}),
    }
    display = [period] if period in periods else ['today', 'week', 'month']
    blocks = [f'📊 <b>ERGASHEV.DEV — STATISTIKA</b>\n{stamp} • Toshkent vaqti']
    for key in display:
        title, stats = periods[key]
        blocks.append(f'<b>{title}</b>\n👀 Ko‘rishlar: <b>{pretty(stats.get("views"))}</b>\n'
                      f'👥 Taxminiy noyob brauzerlar: <b>{pretty(stats.get("visitors"))}</b>')
    if period == 'all':
        total = data.get('total') or {}
        blocks.append(f'<b>JAMI</b>\n🔎 Ko‘rishlar: <b>{pretty(total.get("views"))}</b>\n'
                      f'🖱 Loyiha ochishlar: <b>{pretty(total.get("projectClicks"))}</b>')
    note = 'ℹ️ Noyoblar — odamlar soni emas, anonim brauzer ID bo‘yicha taxmin. Statistikalar saytga o‘rnatilgan sanadan hisoblanadi.'
    if data.get('sampled'):
        note += '\n⚠️ Katta trafik sabab tarix qisman ko‘rsatilgan.'
    blocks.append(note)
    return '\n\n'.join(blocks)

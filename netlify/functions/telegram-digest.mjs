/** OPTIONAL automated Telegram summary at 23:55 Asia/Tashkent every day.
 * Activate by setting TELEGRAM_REPORT_BOT_TOKEN, TELEGRAM_REPORT_CHAT_ID and STATS_READ_TOKEN on Netlify.
 * No always-on Python bot needed for scheduled messages; it uses the same Telegram bot token.
 */
export const config={schedule:'55 18 * * *'}; // UTC = 23:55 in Uzbekistan, no DST.
export default async () => {
  const bot=process.env.TELEGRAM_REPORT_BOT_TOKEN;
  const chat=process.env.TELEGRAM_REPORT_CHAT_ID;
  const token=process.env.STATS_READ_TOKEN;
  const site=(process.env.URL||'https://ergashevdev.netlify.app').replace(/\/$/,'');
  if(!bot||!chat||!token){console.info('telegram-digest disabled: optional environment variables missing');return;}
  try{
    const response=await fetch(`${site}/.netlify/functions/ghost-api?action=stats`,{headers:{authorization:`Bearer ${token}`}});
    if(!response.ok)throw Error('Stats API status '+response.status);
    const stats=await response.json();
    const day=stats.asOf;
    const parts=[`📊 Ergashev.dev • ${day}`,
      `📅 Bugun: ${stats.today.views} ko‘rish, ${stats.today.visitors} noyob brauzer`];
    const dt=new Date(day+'T12:00:00Z');
    if(dt.getUTCDay()===0)parts.push(`🗓 Oxirgi 7 kun: ${stats.week.views} ko‘rish, ${stats.week.visitors} noyob`);
    const tomorrow=new Date(dt);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
    if(tomorrow.getUTCDate()===1)parts.push(`📆 Shu oy: ${stats.month.views} ko‘rish, ${stats.month.visitors} noyob`);
    parts.push('Noyoblar odam emas, anonim brauzerlar bo‘yicha taxminiy hisob.');
    const sent=await fetch(`https://api.telegram.org/bot${bot}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({chat_id:chat,text:parts.join('\n'),disable_web_page_preview:true})});
    if(!sent.ok)throw Error('Telegram status '+sent.status);
  }catch(e){console.error('telegram-digest failed:',e.message);throw e;}
};

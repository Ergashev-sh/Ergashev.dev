/* Render dynamic SEO defaults for browsers; static initial HTML remains crawler fallback. */
fetch('data/seo.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
  if(!data)return;
  if(typeof data.title==='string'&&data.title.length>2)document.title=data.title;
  const desc=document.querySelector('meta[name="description"]');
  if(desc&&typeof data.description==='string'&&data.description.length>2)desc.content=data.description;
}).catch(()=>{});

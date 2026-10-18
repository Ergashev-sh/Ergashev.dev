/* Privacy-conscious, first-party portfolio analytics. No IP, user-agent or URLs stored. */
(() => {
  'use strict';
  const host = location.hostname;
  // Only track the main site, not local development or Netlify deploy previews.
  if (!/^https?:$/.test(location.protocol) || host==='localhost' || host==='127.0.0.1' || (host.endsWith('.netlify.app') && host!=='ergashevdev.netlify.app')) return;
  if (navigator.doNotTrack==='1' || navigator.globalPrivacyControl===true) return;
  let visitor;
  try {
    visitor=localStorage.getItem('erg_visitor_v1');
    if(!visitor || !/^[a-zA-Z0-9-]{20,64}$/.test(visitor)) {
      visitor=crypto.randomUUID();localStorage.setItem('erg_visitor_v1',visitor);
    }
  } catch {visitor=crypto.randomUUID();}
  const send = async (kind,project='') => {
    try {
      await fetch('/.netlify/functions/ghost-api?action=event', {
        method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({kind,project,visitor}),cache:'no-store',keepalive:true
      });
    } catch { /* analytics is best effort, must never break the portfolio */ }
  };
  try {
    if(!sessionStorage.getItem('erg_visit_v1')) {
      sessionStorage.setItem('erg_visit_v1','1');send('pageview');
    }
  } catch {send('pageview');}
  window.addEventListener('erg:project-open',e=>send('project',String(e.detail?.id||'').slice(0,90)));
})();

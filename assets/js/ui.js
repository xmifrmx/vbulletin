import {esc} from './core/util.js';
export const rt={ctx:{}};
export function toast(msg,kind='info'){const box=document.getElementById('toast');if(!box)return;const d=document.createElement('div');d.className='toast '+kind;d.textContent=msg;box.append(d);setTimeout(()=>d.remove(),5500)}
export function dialog(title,body,{ok='Tamam',validate,mount}={}){return new Promise(res=>{
  const d=document.createElement('dialog');d.className='dlg';d.setAttribute('aria-labelledby','dlg-t');
  d.innerHTML=`<form method="dialog"><h2 id="dlg-t">${esc(title)}</h2><div class="dlg-body">${body}</div><p class="dlg-err" role="alert" hidden></p><div class="dlg-act"><button class="btn primary" value="ok">${esc(ok)}</button><button class="btn" value="cancel" formnovalidate>İptal</button></div></form>`;
  document.body.append(d);let vals=null;
  d.querySelector('form').addEventListener('submit',e=>{if(e.submitter?.value!=='ok')return;const v=Object.fromEntries(new FormData(e.target));const err=validate?.(v);
    if(err){e.preventDefault();const p=d.querySelector('.dlg-err');p.textContent=err;p.hidden=false;return}vals=v});
  d.addEventListener('close',()=>{d.remove();res(vals)});mount?.(d);d.showModal();d.querySelector('input:not([type=hidden]),select,textarea')?.focus()})}
export const confirmDlg=(msg,ok='Sil')=>dialog('Onay',`<p>${esc(msg)}</p>`,{ok}).then(v=>!!v);

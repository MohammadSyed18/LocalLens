import type {Digest} from './digest.js';
import type {ReaderState} from './reader.js';
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function renderInbox(digest:Digest, reader:ReaderState):string {
  const cards=digest.items.map(({notice,action,deadline})=>`<article><h2>${escape(notice.title)}</h2>
    <p>${escape(notice.body)}</p><p>${escape(action??'')}${deadline?' · '+escape(deadline):''}</p>
    <a href="${escape(notice.source.url)}" rel="noreferrer">${escape(notice.source.name)}</a>
    <p><button data-id="${escape(notice.id)}" data-action="${reader.readIds.includes(notice.id)?'unread':'read'}">${reader.readIds.includes(notice.id)?'Mark unread':'Mark read'}</button>
    <button data-id="${escape(notice.id)}" data-action="${reader.savedIds.includes(notice.id)?'unsave':'save'}">${reader.savedIds.includes(notice.id)?'Unsave':'Save notice'}</button></p></article>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>LocalLens inbox</title>
    <style>body{font:18px system-ui;background:#f3f5f1;color:#17261e;max-width:800px;margin:auto;padding:24px}article{background:white;padding:24px;margin:20px 0;border-radius:14px}button,a{margin-right:12px}button{padding:10px;border:1px solid #7a8e80;border-radius:8px;cursor:pointer}p{line-height:1.6}nav{display:flex;gap:20px}</style>
    <main><h1>Your community inbox</h1><nav><a href="/">All</a><a href="/?mode=unread">Unread</a><a href="/?mode=saved">Saved</a></nav>
    <p id="status" role="status">${digest.total} notices · ${reader.savedIds.length} saved</p>${cards||'<p>No notices match this view.</p>'}</main>
    <script>document.querySelectorAll('button[data-id]').forEach(button=>button.addEventListener('click',async()=>{
      document.querySelectorAll('button').forEach(item=>item.disabled=true);
      try{const response=await fetch('/reader',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:${reader.revision},action:{type:button.dataset.action,id:button.dataset.id}})});
      if(!response.ok)throw new Error((await response.json()).error||'Could not save');location.reload();}
      catch(error){document.querySelector('#status').textContent=error.message;document.querySelectorAll('button').forEach(item=>item.disabled=false);}
    }));</script></html>`;
}

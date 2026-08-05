import type {Notice} from "./notices.js";import {extract} from "./notices.js";
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]!);
export function noticeHtml(n:Notice){const x=extract(n);return `<article aria-labelledby="notice-${escape(n.id)}"><h2 id="notice-${escape(n.id)}">${escape(n.title)}</h2><p>${escape(n.body)}</p>${x.deadline?`<p><strong>Deadline:</strong> ${escape(x.deadline)}</p>`:""}<p>Source: <a href="${escape(n.source.url)}">${escape(n.source.name)}</a></p></article>`}

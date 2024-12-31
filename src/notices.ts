import {promises as fs} from "node:fs";
import {dirname} from "node:path";
import {randomUUID} from "node:crypto";
export type Notice={id:string;title:string;body:string;source:{name:string;url:string};publishedAt:string;tags:string[]};
export function validate(value:unknown):Notice {
 if(!value||typeof value!=="object")throw new Error("notice must be an object");
 const v=value as Record<string,unknown>,s=v.source as Record<string,unknown>;
 const text=(x:unknown):x is string=>typeof x==="string"&&x.trim().length>0;
 if(!text(v.id)||!text(v.title)||!text(v.body)||!s||!text(s.name)||!text(s.url)||!text(v.publishedAt)||Number.isNaN(Date.parse(v.publishedAt))||!Array.isArray(v.tags)||!v.tags.every(text))throw new Error("invalid notice schema");
 const url=new URL(s.url);if(!["http:","https:"].includes(url.protocol))throw new Error("source URL must use HTTP or HTTPS");
 return {id:v.id.trim(),title:v.title.trim(),body:v.body.trim(),source:{name:s.name.trim(),url:url.href},publishedAt:new Date(v.publishedAt).toISOString(),tags:[...new Set(v.tags.map(tag=>tag.trim()))]};
}
export function extract(n:Notice){const deadline=n.body.match(/(?:by|before|deadline:?)[ ]+([A-Z][a-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i)?.[1]??null;const action=n.body.match(/\b(register|apply|submit|attend|bring|contact|complete)\b[^.!?]*/i)?.[0]??null;return {deadline,action};}
export function dedupe(values:Notice[]){const keys=new Set<string>();return values.filter(n=>{const k=(n.title+"|"+n.body).toLowerCase().replace(/\W/g,"");if(keys.has(k))return false;keys.add(k);return true;});}
export class Store {
 private pending:Promise<void>=Promise.resolve();
 constructor(private path:string){}
 async load():Promise<Notice[]> {
  let text:string;
  try{text=await fs.readFile(this.path,"utf8")}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return[];throw error}
  try{const value:unknown=JSON.parse(text);if(!Array.isArray(value))throw new Error("stored notices must be an array");return value.map(validate)}
  catch{try{await fs.rename(this.path,this.path+`.corrupt-${Date.now()}-${randomUUID()}`)}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error}return[]}
 }
 async save(values:Notice[]) {
  const notices=values.map(validate);await fs.mkdir(dirname(this.path),{recursive:true});
  const temporary=this.path+`.${randomUUID()}.tmp`;
  try{await fs.writeFile(temporary,JSON.stringify(notices,null,2));await fs.rename(temporary,this.path)}finally{await fs.rm(temporary,{force:true})}
 }
 upsert(value:unknown):Promise<Notice> {
  const notice=validate(value);
  const operation=this.pending.then(async()=>{
   const notices=await this.load(),index=notices.findIndex(n=>n.id===notice.id);
   if(index>=0&&Date.parse(notices[index].publishedAt)>Date.parse(notice.publishedAt))throw new Error("stale notice update");
   if(index>=0)notices[index]=notice;else notices.push(notice);
   await this.save(notices);return notice;
  });
  this.pending=operation.then(()=>undefined,()=>undefined);return operation;
 }
}
export function briefing(values:Notice[],interests:string[]){return dedupe(values).filter(n=>!interests.length||n.tags.some(t=>interests.includes(t))).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).map(n=>({...n,summary:extract(n),accessibleText:`${n.title}. Source: ${n.source.name}. ${n.body}`}));}

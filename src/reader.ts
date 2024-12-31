import {readFile, writeFile, mkdir, rename, rm} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createDigest, type Digest} from './digest.js';
import type {Notice} from './notices.js';

export type ReaderState = {version:1; revision:number; readIds:string[]; savedIds:string[]; includeTags:string[]; excludeTags:string[]};
export type ReaderAction = {type:'read'|'unread'|'save'|'unsave'; id:string} | {type:'preferences'; includeTags:string[]; excludeTags:string[]};
export class ReaderConflict extends Error {}
const initial = ():ReaderState => ({version:1,revision:0,readIds:[],savedIds:[],includeTags:[],excludeTags:[]});
function strings(value:unknown):string[] {
  if (!Array.isArray(value) || value.length>10000 || value.some(item=>typeof item!=='string'||!item.trim()||item.length>200)) throw new Error('Invalid reader list');
  return [...new Set((value as string[]).map(item=>item.trim()))].sort();
}
function decode(raw:string):ReaderState {
  const value=JSON.parse(raw);
  if (!value || value.version!==1 || !Number.isSafeInteger(value.revision)||value.revision<0) throw new Error('Invalid reader state');
  const state:ReaderState={version:1,revision:value.revision,readIds:strings(value.readIds),savedIds:strings(value.savedIds),includeTags:strings(value.includeTags),excludeTags:strings(value.excludeTags)};
  if (state.includeTags.some(tag=>state.excludeTags.includes(tag))) throw new Error('Conflicting reader preferences');
  return state;
}

/** Local single-reader state. Writes queue and atomically replace a validated snapshot. */
export class ReaderStore {
  private pending:Promise<unknown>=Promise.resolve();
  constructor(private path:string) {}
  async load():Promise<ReaderState> {
    try {return decode(await readFile(this.path,'utf8'));}
    catch(error) {if ((error as NodeJS.ErrnoException).code==='ENOENT') return initial();throw error;}
  }
  update(expectedRevision:number, action:ReaderAction):Promise<ReaderState> {
    const result=this.pending.then(async()=>{
      const state=await this.load();
      if (!Number.isSafeInteger(expectedRevision)||state.revision!==expectedRevision) throw new ReaderConflict('Reader changed; reload before saving');
      if (!action || typeof action!=='object') throw new Error('Reader action required');
      if (action.type==='preferences') {
        state.includeTags=strings(action.includeTags).map(tag=>tag.toLowerCase());
        state.excludeTags=strings(action.excludeTags).map(tag=>tag.toLowerCase());
      } else {
        if (!['read','unread','save','unsave'].includes(action.type)) throw new Error('Unknown reader action');
        const [id]=strings([action.id]);
        const key=action.type==='read'||action.type==='unread'?'readIds':'savedIds';
        const ids=new Set(state[key]);
        if (action.type==='read'||action.type==='save') ids.add(id);else ids.delete(id);
        state[key]=[...ids];
      }
      state.revision++;
      const checked=decode(JSON.stringify(state));
      await mkdir(dirname(this.path),{recursive:true});
      const temporary=this.path+'.'+randomUUID()+'.tmp';
      try {await writeFile(temporary,JSON.stringify(checked,null,2));await rename(temporary,this.path);}
      finally {await rm(temporary,{force:true});}
      return checked;
    });
    this.pending=result.catch(()=>undefined);return result;
  }
}

export function inbox(notices:Notice[], reader:ReaderState, {mode='all',now=new Date().toISOString()}={}) : Digest {
  if (!['all','unread','saved'].includes(mode)) throw new Error('Unknown inbox mode');
  const visible=notices.filter(notice=>mode==='unread'?!reader.readIds.includes(notice.id):mode==='saved'?reader.savedIds.includes(notice.id):true);
  return createDigest(visible,{includeTags:reader.includeTags,excludeTags:reader.excludeTags,now,limit:100});
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ReaderStore,inbox} from '../src/reader.js';
import {renderInbox} from '../src/inboxHtml.js';
const notice={id:'a',title:'<script>bad</script>',body:'Register today.',publishedAt:'2024-01-01',tags:['school'],source:{name:'School',url:'https://example.test'}};
test('saved and read state persists; stale concurrent edits conflict',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'reader-'));
  try {
    const path=join(dir,'reader.json'),store=new ReaderStore(path);
    const results=await Promise.allSettled([store.update(0,{type:'save',id:'a'}),store.update(0,{type:'read',id:'a'})]);
    assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
    const state=await new ReaderStore(path).load();assert.equal(state.revision,1);
    const next=await store.update(1,{type:'read',id:'a'});
    assert.equal(inbox([notice],next,{mode:'unread'}).total,0);
    assert.equal(inbox([notice],next,{mode:'saved'}).total,1);
    assert.ok(!renderInbox(inbox([notice],next),next).includes('<script>bad</script>'));
    const before=await readFile(path,'utf8');
    await assert.rejects(store.update(2,{type:'preferences',includeTags:['school'],excludeTags:['school']}));
    assert.equal(await readFile(path,'utf8'),before);
    await writeFile(path,'broken');await assert.rejects(store.update(2,{type:'save',id:'b'}));
    assert.equal(await readFile(path,'utf8'),'broken');
  } finally {await rm(dir,{recursive:true,force:true});}
});

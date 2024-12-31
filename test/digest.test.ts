import test from 'node:test';
import assert from 'node:assert/strict';
import {createDigest,digestToRss} from '../src/digest.js';
import type {Notice} from '../src/notices.js';
function notice(id:string,tags=['school'],date='2026-07-01'):Notice {
  return {id,title:`Notice ${id}`,body:`Submit ${id} by August 1, 2026.`,source:{name:'School',url:'https://school.example'},publishedAt:date,tags};
}
test('digest filters future and excluded notices with consistent personalized pagination',()=>{
  const values=[notice('a'),notice('b'),notice('c'),notice('future',['school'],'2027-01-01'),notice('blocked',['school','sport'])];
  const options={includeTags:['SCHOOL'],excludeTags:['sport'],now:'2026-07-02',limit:2};
  const first=createDigest(values,options);
  assert.equal(first.total,3);assert.equal(first.items.length,2);
  assert.ok(first.nextCursor);
  const second=createDigest(values,{...options,now:first.generatedAt,cursor:first.nextCursor!});
  assert.equal(second.items.length,1);
  assert.equal(new Set([...first.items,...second.items].map(item=>item.notice.id)).size,3);
  assert.throws(()=>createDigest([...values,notice('extra')],{...options,cursor:first.nextCursor!}),/Stale/);
});
test('digest rejects invalid bounds and escapes RSS text',()=>{
  assert.throws(()=>createDigest([],{includeTags:['a'],excludeTags:['a']}));
  assert.throws(()=>createDigest([],{since:'2027-01-01',now:'2026-01-01'}));
  assert.throws(()=>createDigest([],{limit:0}));
  const item=notice('a');item.title='<script>&bad';
  const rss=digestToRss(createDigest([item],{now:'2026-07-02'}));
  assert.ok(rss.includes('&lt;script&gt;&amp;bad'));
  assert.ok(!rss.includes('<script>'));
});

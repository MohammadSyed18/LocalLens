import type {Notice} from "./notices.js";
export type Preferences={includeTags:string[];excludeTags:string[];maxItems:number};
export function validatePreferences(v:Preferences){if(!Number.isInteger(v.maxItems)||v.maxItems<1||v.maxItems>100)throw new Error("maxItems must be 1..100");if(v.includeTags.some(x=>v.excludeTags.includes(x)))throw new Error("a tag cannot be included and excluded");return v}
export function relevance(n:Notice,p:Preferences){let score=n.tags.filter(x=>p.includeTags.includes(x)).length*3-n.tags.filter(x=>p.excludeTags.includes(x)).length*10;if(/urgent|closure|deadline/i.test(n.title+" "+n.body))score+=2;return score}
export function personalize(values:Notice[],p:Preferences){validatePreferences(p);return values.map(n=>({notice:n,score:relevance(n,p)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).slice(0,p.maxItems)}

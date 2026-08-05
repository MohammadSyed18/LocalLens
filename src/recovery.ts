export type PendingNotice={payload:unknown;attempts:number;nextAttemptAt:number;lastError:string};
export function retry(p:PendingNotice,error:Error,now=Date.now()):PendingNotice{const attempts=p.attempts+1;if(attempts>5)throw new Error("retry limit exceeded",{cause:error});const delay=Math.min(60_000,1000*2**(attempts-1));return{...p,attempts,nextAttemptAt:now+delay,lastError:error.message}}
export function ready(items:PendingNotice[],now=Date.now()){return items.filter(x=>x.nextAttemptAt<=now)}

export type Language = 'auto' | 'en' | 'hi' | 'te';
export function matchingVoice<T extends {lang:string}>(voices:T[],language:string):T|undefined {
  if(language==='auto') return undefined;
  return voices.find(v=>v.lang.toLowerCase().split(/[-_]/)[0]===language.toLowerCase().split(/[-_]/)[0]);
}
export function remainingSeconds(expiresAt:string, now=Date.now()):number {return Math.max(0,Math.ceil((new Date(expiresAt).getTime()-now)/1000)) || 0;}
export function readableError(error:unknown):string {return error instanceof Error?error.message:'Something went wrong. Please try again.';}

import {describe,it,expect} from 'vitest';
import {assertOrigin,boundedJson,ipHash} from './security';
describe('server boundaries',()=>{
  it('accepts full multilingual documents within the document byte limit',async()=>{const content='ह'.repeat(16000);const request=new Request('https://app.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content})});await expect(boundedJson(request,65536)).resolves.toEqual({content});});
  it('rejects missing and foreign mutation origins',()=>{expect(()=>assertOrigin(new Request('https://app.test'), 'https://app.test')).toThrow();expect(()=>assertOrigin(new Request('https://app.test',{headers:{origin:'https://evil.test'}}),'https://app.test')).toThrow();});
  it('allows the exact origin',()=>{expect(()=>assertOrigin(new Request('https://app.test',{headers:{origin:'https://app.test'}}),'https://app.test')).not.toThrow();});
  it('does not trust forwarded headers outside Vercel',()=>{const a=new Request('https://app.test',{headers:{'x-forwarded-for':'1.2.3.4'}});const b=new Request('https://app.test',{headers:{'x-forwarded-for':'8.8.8.8'}});expect(ipHash(a,'secret',false)).toBe(ipHash(b,'secret',false));expect(()=>ipHash(a,'secret',true)).toThrow();});
  it('bounds actual body bytes rather than trusting content-length',async()=>{await expect(boundedJson(new Request('https://app.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'x'.repeat(9000)})}))).rejects.toThrow('too large');});
  it('rejects malformed JSON',async()=>{await expect(boundedJson(new Request('https://app.test',{method:'POST',headers:{'content-type':'application/json'},body:'{'}))).rejects.toThrow('Invalid JSON');});
});

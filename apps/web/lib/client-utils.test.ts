import {describe,it,expect} from 'vitest';
import {matchingVoice,remainingSeconds} from './client-utils';
describe('speech safety',()=>{it('never substitutes English for an unavailable Telugu voice',()=>expect(matchingVoice([{lang:'en-US'}],'te')).toBeUndefined());it('matches regional language voices',()=>expect(matchingVoice([{lang:'hi-IN'}],'hi')).toEqual({lang:'hi-IN'}));it('does not guess auto language',()=>expect(matchingVoice([{lang:'en-US'}],'auto')).toBeUndefined());});
describe('session limits',()=>{it('clamps expired sessions',()=>expect(remainingSeconds('2020-01-01',Date.parse('2021-01-01'))).toBe(0));it('counts remaining seconds',()=>expect(remainingSeconds('2026-01-01T00:01:00Z',Date.parse('2026-01-01T00:00:00Z'))).toBe(60));});

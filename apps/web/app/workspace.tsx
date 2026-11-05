'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Room, RoomEvent, type TranscriptionSegment } from 'livekit-client';
import { ArrowUp, ArrowUpRight, AudioLines, BookOpen, Check, ChevronRight, Clock3, Download, FileText, History, LayoutDashboard, LoaderCircle, Mic, MicOff, Moon, Plus, Search, Settings2, ShieldCheck, Square, Sun, Trash2, X } from 'lucide-react';
import { matchingVoice, readableError, remainingSeconds, type Language } from '@/lib/client-utils';

import LocalMicrophone from './local-microphone';
import Records from './records';

type View = 'overview' | 'conversation' | 'memory' | 'history' | 'settings';
type Message = { id:string; role:string; content:string; final?:boolean };
type Memory = {id:string;content:string;type?:string;source?:string;created_at?:string};
type Session = {sessionId:string;token:string;expiresAt:string;mode:string;url?:string};
type Event = {name:string;action?:string;result:unknown};
const localUrl = process.env.NEXT_PUBLIC_LOCAL_API_URL || '';
const prompts = ['Hi, what can you do?', "Remember that I’m preparing for software engineering interviews.", 'Create a note and add a task for me.', 'Can we continue in Hindi?', 'తెలుగులో మాట్లాడగలవా?'];
const navigation = [{id:'overview',label:'Overview',icon:LayoutDashboard},{id:'conversation',label:'Conversation',icon:AudioLines},{id:'memory',label:'Memory',icon:BookOpen},{id:'history',label:'History',icon:History},{id:'settings',label:'Settings',icon:Settings2}] as const;

export default function Workspace(){
  const [view,setView]=useState<View>('overview');
  const [dark,setDark]=useState(false);
  const [health,setHealth]=useState<{configured:boolean;message:string}|null>(null);
  const [session,setSession]=useState<Session|null>(null);
  const [status,setStatus]=useState('Not connected');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [language,setLanguage]=useState<Language>('auto');
  const [consent,setConsent]=useState(false);
  const [speech,setSpeech]=useState(false);
  const [mic,setMic]=useState(false);
  const [seconds,setSeconds]=useState(0);
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [events,setEvents]=useState<Event[]>([]);
  const [memories,setMemories]=useState<Memory[]>([]);
  const [query,setQuery]=useState('');
  const [history,setHistory]=useState<{id:string;created_at:string;language?:string}[]>([]);
  const [historyMessages,setHistoryMessages]=useState<Message[]>([]);
  const [email,setEmail]=useState('');
  const [localKey,setLocalKey]=useState('');
  const [signedIn,setSignedIn]=useState(false);
  const [editing,setEditing]=useState<Memory|null>(null);
  const [deleting,setDeleting]=useState<string|null>(null);
  const [documentTitle,setDocumentTitle]=useState('');
  const [documentText,setDocumentText]=useState('');
  const room=useRef<Room|null>(null);
  const agentTimers=useRef<number[]>([]);
  const clearAgentTimers=()=>{agentTimers.current.forEach(window.clearTimeout);agentTimers.current=[];};
  const client=useRef<SupabaseClient|null>(null);
  const abort=useRef<AbortController|null>(null);
  const audioContainer=useRef<HTMLDivElement>(null);
  const transcript=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){
      client.current=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const {data}=client.current.auth.onAuthStateChange((_event,s)=>setSignedIn(Boolean(s?.user&&!s.user.is_anonymous)));
      return ()=>data.subscription.unsubscribe();
    }
  },[]);
  useEffect(()=>{fetch(localUrl?`${localUrl}/health`:'/api/health').then(r=>r.json()).then(setHealth).catch(()=>setHealth({configured:false,message:'The service is unreachable. Check your local setup or try again later.'}));},[]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
  useEffect(()=>{transcript.current?.scrollTo({top:transcript.current.scrollHeight,behavior:'smooth'});},[messages]);
  useEffect(()=>()=>{clearAgentTimers();abort.current?.abort();void room.current?.disconnect();window.speechSynthesis?.cancel();},[]);

  const request=useCallback(async(path:string,method='GET',body?:unknown)=>{
    let token=session?.token;
    if(!localUrl) token=(await client.current?.auth.getSession())?.data.session?.access_token;
    if(!token) throw new Error(localUrl?'Start a local session first.':'Sign in to access your saved workspace.');
    const response=await fetch(localUrl?`${localUrl}${path}`:`/api${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||data.detail||'Request failed. Please try again.');
    return data;
  },[session]);

  const end=useCallback(async()=>{
    abort.current?.abort(); window.speechSynthesis?.cancel();
    clearAgentTimers();await room.current?.disconnect();room.current=null;setMic(false);
    if(session){try{await request(localUrl?'/sessions':'/session','DELETE',localUrl?undefined:{sessionId:session.sessionId});}catch{/* Server-side expiry remains authoritative. */}}
    setSession(null);setStatus('Session ended');setBusy(false);
  },[session,request]);
  useEffect(()=>{if(!session)return;const timer=setInterval(()=>{const n=remainingSeconds(session.expiresAt);setSeconds(n);if(n===0)void end();},1000);return()=>clearInterval(timer);},[session,end]);

  function speak(text:string){
    if(!speech||!window.speechSynthesis)return;
    const detected=language==='auto'?(/[\u0C00-\u0C7F]/.test(text)?'te':/[\u0900-\u097F]/.test(text)?'hi':'en'):language;
    const voice=matchingVoice(window.speechSynthesis.getVoices(),detected);
    if(!voice){setNotice('No matching browser voice is installed. The response is available as text.');return;}
    window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;window.speechSynthesis.speak(utterance);
  }

  async function start(){
    setView('conversation');setBusy(true);setError('');setStatus('Starting session');
    try{
      if(!health?.configured)throw new Error(health?.message||'Checking service availability. Please try again shortly.');
      let active:Session;
      if(localUrl){
        const r=await fetch(`${localUrl}/sessions`,{method:'POST',headers:{'Content-Type':'application/json',...(localKey?{'X-Local-Key':localKey}:{})},body:JSON.stringify({language,memoryConsent:consent})});const data=await r.json();if(!r.ok)throw new Error(data.detail||'Unable to start session.');
        active={sessionId:data.session.id,token:data.token,expiresAt:data.session.expires_at,mode:data.session.mode};setStatus('Text session ready');
      }else{
        if(!client.current)throw new Error('Authentication is not configured.');
        let auth=(await client.current.auth.getSession()).data.session;
        if(!auth){const result=await client.current.auth.signInAnonymously();if(result.error)throw new Error(result.error.message);auth=result.data.session;}
        const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth?.access_token}`},body:JSON.stringify({language,memoryConsent:consent})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Unable to start voice session.');active=data;
        const connection=new Room();room.current=connection;
        connection.registerTextStreamHandler('recall.tools',async(reader)=>{try{const data=JSON.parse(await reader.readAll());if(Array.isArray(data))setEvents(previous=>[...previous,...data]);}catch{setNotice('Tool activity could not be decoded.');}});
        connection.on(RoomEvent.Reconnecting,()=>setStatus('Reconnecting'));
        connection.on(RoomEvent.Reconnected,()=>setStatus('Connected'));
        connection.on(RoomEvent.Disconnected,()=>{clearAgentTimers();setStatus('Disconnected');setMic(false);});
        connection.on(RoomEvent.ParticipantConnected,participant=>{if(participant.isAgent){clearAgentTimers();setError('');setStatus('Agent connected');}});
        connection.on(RoomEvent.AudioPlaybackStatusChanged,()=>{if(!connection.canPlaybackAudio)setNotice('Click anywhere on the page to allow the agent’s voice to play.');});
        connection.on(RoomEvent.ParticipantAttributesChanged,(changed,participant)=>{if(participant.isAgent&&changed['lk.agent.state'])setStatus(changed['lk.agent.state']);});
        connection.registerTextStreamHandler('recall.reply',async(reader)=>{const text=(await reader.readAll()).trim();if(text)setMessages(previous=>[...previous,{id:crypto.randomUUID(),role:'assistant',content:text,final:true}]);});
        connection.on(RoomEvent.TranscriptionReceived,(segments:TranscriptionSegment[],participant)=>{
          // Agent text arrives on 'recall.reply' so it never depends on TTS playout; only the user's STT is shown here.
          if(participant?.isAgent)return;
          for(const segment of segments)setMessages(previous=>{const next={id:segment.id,role:participant?.isAgent?'assistant':'user',content:segment.text,final:segment.final};return previous.some(m=>m.id===segment.id)?previous.map(m=>m.id===segment.id?next:m):[...previous,next];});
        });
        connection.on(RoomEvent.TrackSubscribed,track=>{if(track.kind==='audio'){const element=track.attach();audioContainer.current?.appendChild(element);}});
        connection.on(RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(element=>element.remove()));
        setStatus('Connecting to voice agent');await connection.connect(active.url!,active.token);
        void connection.startAudio().catch(()=>{});
        if(!Array.from(connection.remoteParticipants.values()).some(p=>p.isAgent)){
          setStatus('Connected · waiting for agent');
          agentTimers.current=[
            window.setTimeout(()=>setStatus('Waking the agent… the first start after idle can take ~10 seconds'),4000),
            window.setTimeout(()=>{setError('The voice agent did not join. End the session and try again, or continue in text.');setStatus('Agent unavailable');},30000),
          ];
        }else setStatus('Agent connected');
      }
      setSession(active);setSeconds(remainingSeconds(active.expiresAt));setMessages([]);setEvents([]);
    }catch(e){setError(readableError(e));setStatus('Unavailable');await room.current?.disconnect();room.current=null;}
    finally{setBusy(false);}
  }

  async function toggleMic(){
    try{if(!room.current)throw new Error('Microphone streaming requires a configured LiveKit session. Local text mode is available.');await room.current.localParticipant.setMicrophoneEnabled(!mic);setMic(!mic);setError('');}
    catch(e){setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in browser settings or continue with text.':readableError(e));}
  }

  async function send(event:React.FormEvent){
    event.preventDefault();if(!input.trim()||!session||busy)return;const text=input.trim();setInput('');setError('');setBusy(true);setStatus('Thinking');
    setMessages(previous=>[...previous,{id:crypto.randomUUID(),role:'user',content:text}]);
    try{
      if(localUrl){
        abort.current=new AbortController();
        const r=await fetch(`${localUrl}/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({session_id:session.sessionId,message:text,language}),signal:abort.current.signal});
        const data=await r.json();if(!r.ok)throw new Error(data.detail||'The model is unavailable.');
        setMessages(previous=>[...previous,{id:crypto.randomUUID(),role:'assistant',content:data.message}]);setEvents(previous=>[...previous,...data.tool_events]);speak(data.message);setStatus('Text session ready');
      }else{await room.current!.localParticipant.sendText(text,{topic:'lk.chat'});setStatus('Connected');}
    }catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError(readableError(e));setStatus('Ready');}
    finally{setBusy(false);}
  }

  async function load(target:View){
    setView(target);setError('');setNotice('');
    try{
      if(target==='memory')setMemories((await request('/memories')).memories);
      if(target==='history'){const data=await request('/history');setHistory(data.sessions);setHistoryMessages(data.messages||[]);}
    }catch(e){setError(readableError(e));}
  }
  async function saveSettings(){try{await request('/settings','PUT',{language,memoryConsent:consent,theme:dark?'dark':'light',voicePreference:speech?'browser':'off'});setNotice('Preferences saved. Start a new session to apply language changes to voice.');}catch(e){setError(readableError(e));}}
  async function signIn(){try{if(!client.current)throw new Error('Cloud authentication is not configured yet.');const {error}=await client.current.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});if(error)throw error;setNotice('Check your email for the sign-in link.');}catch(e){setError(readableError(e));}}
  async function exportMemory(){const blob=new Blob([JSON.stringify(memories,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='recall-memory.json';a.click();URL.revokeObjectURL(url);}

  return <div className="app-shell">
    <aside className="sidebar"><a href="#overview" className="brand" onClick={()=>setView('overview')}><span className="brand-symbol"><AudioLines size={23}/></span>recall<span className="brand-dot">.</span></a><div className="workspace-label">Your voice workspace</div><nav aria-label="Main navigation">{navigation.map(item=><button key={item.id} className={view===item.id?'nav-item active':'nav-item'} onClick={()=>void load(item.id)}><item.icon size={19}/>{item.label}{item.id==='conversation'&&session&&<span className="live-dot"/>}</button>)}</nav><div className="sidebar-bottom"><div className="private-note"><ShieldCheck size={19}/><div>Memory on your terms<small>You choose what stays.</small></div></div><button className="theme-button" onClick={()=>setDark(!dark)}>{dark?<Sun size={17}/>:<Moon size={17}/>} {dark?'Light appearance':'Dark appearance'}</button><div className="profile"><span>Y</span><div>{signedIn?'Personal account':'Guest workspace'}<small>{localUrl?'Local execution':'Portfolio edition'}</small></div></div></div></aside>
    <main><header className="topbar"><div>Workspace <ChevronRight size={14}/> <strong>{navigation.find(n=>n.id===view)?.label}</strong></div><span className="service-status"><i className={health?.configured?'ready':''}/>{health===null?'Checking service':health.configured?'Service configured':'Setup required'}</span></header>
    <div className="page-content">
      {error&&<div className="banner error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
      {notice&&<div className="banner" role="status"><span>{notice}</span><button aria-label="Dismiss notice" onClick={()=>setNotice('')}><X size={16}/></button></div>}
      {view==='overview'&&<><section className="intro"><div className="intro-copy"><h1>A conversation.<br/><em>A little more continuity.</em></h1><p>Think out loud in your language. Turn a passing thought into a useful note, a next step, or a memory you can come back to.</p><button className="primary large" onClick={()=>void start()} disabled={busy}><Mic size={18}/>Try Voice Agent<ArrowUpRight size={18}/></button><div className="intro-foot">English · हिन्दी · తెలుగు <span>Speech verification pending</span></div></div><div className="conversation-preview"><div className="preview-heading"><AudioLines size={20}/><span>A workspace that listens</span></div><div className="wave-art" aria-hidden="true">{Array.from({length:35},(_,i)=><i key={i} style={{height:`${12+Math.abs(Math.sin(i*.7))*55+Math.abs(Math.cos(i*.3))*35}px`}}/>)}</div><div className="preview-bottom"><span>Voice. Context. Continuity.</span><span className="sample-label">Interface illustration</span></div></div></section><section className="start-section"><div className="section-heading"><h2>Where would you like to start?</h2><span>No script required</span></div><div className="prompt-grid">{prompts.slice(0,3).map((prompt,i)=><button key={prompt} onClick={()=>{setInput(prompt);setView('conversation');}}><span>{['Explore the agent','Keep a useful detail','Make room for action'][i]}</span><p>“{prompt}”</p><ArrowUpRight size={18}/></button>)}</div></section><section className="architecture"><div><h2>More than a voice interface.</h2><p>Follow the conversation, inspect what was remembered, and see the tools behind each action. Nothing saved needs to be a mystery.</p></div><ol><li><span>Conversation</span><p>LiveKit carries audio; language-aware transcription preserves your words.</p></li><li><span>Reasoning & tools</span><p>LangGraph coordinates bounded tool calls and grounded responses.</p></li><li><span>Memory you control</span><p>Owner-scoped storage keeps records separate, editable, and exportable.</p></li></ol></section><div className="setup-note"><ShieldCheck size={19}/><p>{health?.message||'Checking backend configuration…'} No live performance claims are made.</p></div><footer>Built with Next.js · Python · LiveKit · LangGraph · Supabase {process.env.NEXT_PUBLIC_GITHUB_URL?.trim()&&<a href={process.env.NEXT_PUBLIC_GITHUB_URL.trim()} target="_blank" rel="noreferrer">View source <ArrowUpRight size={14}/></a>}</footer></>}
      {view==='conversation'&&<><div className="page-heading"><div><h1>Make space for a thought.</h1><p>Speak naturally. Keep the useful parts.</p></div><select aria-label="Conversation language" value={language} disabled={Boolean(session)} onChange={e=>setLanguage(e.target.value as Language)}><option value="auto">Auto-detect language</option><option value="en">English · experimental</option><option value="hi">हिन्दी · experimental</option><option value="te">తెలుగు · experimental</option></select></div><div className="conversation-grid"><section className="conversation-panel"><div className="session-bar"><span><i className={session?'live-dot':'offline-dot'}/>{status}</span>{session&&<span><Clock3 size={14}/>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span>}</div><div className="transcript" ref={transcript} aria-live="polite" aria-label="Conversation transcript">{messages.length?messages.map(m=><article key={m.id} className={`message ${m.role}`}><small>{m.role==='user'?'You':'Recall'}</small><p>{m.content}</p></article>):<div className="conversation-empty"><div className="voice-disc"><AudioLines size={45} strokeWidth={1}/></div><h2>Your next thought starts here.</h2><p>{session?'Type below, or enable your microphone for a voice session.':'Start a session when you’re ready. Microphone access is only requested when you enable it.'}</p>{!session&&<button className="primary" onClick={()=>void start()} disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Mic size={17}/>}Start conversation</button>}</div>}</div><form className="composer" onSubmit={send}><input aria-label="Message" placeholder={session?'Type a thought, question, or request…':'Start a session to send a message'} value={input} maxLength={4000} onChange={e=>setInput(e.target.value)} disabled={!session}/><button className="send" aria-label="Send message" disabled={!session||busy||!input.trim()}><ArrowUp size={19}/></button></form><div className="voice-controls">{localUrl&&session&&<LocalMicrophone url={localUrl} token={session.token} language={language} onTranscript={setInput} onError={setError}/>}<button onClick={()=>void toggleMic()} disabled={!session||Boolean(localUrl)} className={mic?'mic-on':''}>{mic?<Mic size={17}/>:<MicOff size={17}/>} {mic?'Mute microphone':'Enable microphone'}</button><button disabled={!session} onClick={()=>{window.speechSynthesis?.cancel();abort.current?.abort();if(room.current)void room.current.localParticipant.sendText('/interrupt',{topic:'recall.control'});setBusy(false);}}><Square size={13}/>Interrupt</button>{session&&<button className="end-session" onClick={()=>void end()}>End session</button>}</div></section><aside className="session-inspector"><h3>In this session</h3><div className="inspector-section"><span className="inspector-label">Memory</span><label className="check-row"><input type="checkbox" checked={consent} disabled={Boolean(session)} onChange={e=>setConsent(e.target.checked)}/>Allow explicit memories</label><p>{session?.mode==='authenticated'?'Saved to your personal workspace.':'Guest information is isolated and expires with the session.'} Sensitive facts are not saved automatically.</p></div><div className="inspector-section"><span className="inspector-label">Tool activity</span>{events.length?events.map((event,i)=><details key={i}><summary><Check size={14}/>{event.action||event.name}</summary><pre>{JSON.stringify(event.result,null,2)}</pre></details>):<p>Tool results will appear here when the agent takes an action.</p>}</div><div className="inspector-section"><span className="inspector-label">Try saying</span>{prompts.slice(3).map(prompt=><button className="text-prompt" key={prompt} onClick={()=>setInput(prompt)}>{prompt}<ArrowUpRight size={14}/></button>)}</div><p className="quiet">All three speech flows remain experimental until real audio tests pass. Text stays available when a matching voice is unavailable.</p></aside></div></>}
      {view==='memory'&&<><div className="page-heading"><div><h1>A little context, kept.</h1><p>Your memories belong to you. Review, correct, or let them go.</p></div><button className="secondary" onClick={()=>void exportMemory()} disabled={!memories.length}><Download size={16}/>Export JSON</button></div><div className="search-field"><Search size={18}/><input aria-label="Search memories" placeholder="Search your memories" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="memory-list">{memories.filter(m=>m.content.toLowerCase().includes(query.toLowerCase())).map(memory=><article className="memory-row" key={memory.id}><div><span className="memory-type">{memory.type||'semantic'}</span><p>{memory.content}</p><small>{memory.source||'Explicit memory'} · {memory.created_at?new Date(memory.created_at).toLocaleDateString():''}</small></div><div className="row-actions"><button onClick={()=>setEditing(memory)}>Edit</button><button aria-label="Delete memory" onClick={()=>setDeleting(memory.id)}><Trash2 size={16}/></button></div>{editing?.id===memory.id&&<form className="inline-editor" onSubmit={async e=>{e.preventDefault();try{await request('/memories','PATCH',{id:editing.id,content:editing.content});setEditing(null);await load('memory');}catch(error){setError(readableError(error));}}}><textarea aria-label="Edit memory content" value={editing.content} onChange={e=>setEditing({...editing,content:e.target.value})}/><button className="primary">Save correction</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></form>}{deleting===memory.id&&<div className="delete-confirm">Delete this memory permanently?<button onClick={async()=>{try{await request('/memories','DELETE',{id:memory.id});setDeleting(null);await load('memory');}catch(e){setError(readableError(e));}}}>Confirm delete</button><button onClick={()=>setDeleting(null)}>Keep memory</button></div>}</article>)}</div>{!memories.length&&<div className="empty-state"><BookOpen size={38} strokeWidth={1}/><h2>Room for what matters.</h2><p>Start a conversation, enable memory, and ask Recall to remember a useful detail. Sign in for memory across sessions.</p><button className="secondary" onClick={()=>setView('conversation')}>Go to conversation<ArrowUpRight size={16}/></button></div>}<Records request={request} onError={setError}/><section className="document-section"><h2>Give a conversation some grounding.</h2><p>Add text you own for document search. Documents are treated as data, never instructions.</p><input aria-label="Document title" placeholder="Document title" value={documentTitle} onChange={e=>setDocumentTitle(e.target.value)}/><textarea aria-label="Document text" placeholder="Paste document text (up to 16,000 characters)" maxLength={16000} value={documentText} onChange={e=>setDocumentText(e.target.value)}/><button className="secondary" disabled={!documentText||!documentTitle} onClick={async()=>{try{const data=await request('/documents','POST',{title:documentTitle,content:documentText});setNotice(`Added ${data.chunks} document chunks.`);setDocumentText('');}catch(e){setError(readableError(e));}}}><Plus size={16}/>Add document</button></section></>}
      {view==='history'&&<><div className="page-heading"><div><h1>Pick up a thread.</h1><p>Past conversations, in their original words.</p></div><button className="secondary" onClick={()=>void load('history')}>Refresh</button></div>{!history.length?<div className="empty-state"><History size={38} strokeWidth={1}/><h2>A fresh page.</h2><p>Authenticated conversations appear here. Guest sessions are temporary.</p></div>:history.map(item=><button className="history-row" key={item.id} onClick={async()=>{try{const data=await request(`/history?sessionId=${item.id}`);setHistoryMessages((data.messages||[]).filter((m:Message&{session_id?:string})=>!localUrl||m.session_id===item.id));}catch(e){setError(readableError(e));}}}><FileText size={19}/><span>Conversation <small>{new Date(item.created_at).toLocaleString()}</small></span><ChevronRight size={18}/></button>)}{historyMessages.map(m=><article className={`message ${m.role}`} key={m.id}><small>{m.role}</small><p>{m.content}</p></article>)}</>}
      {view==='settings'&&<><div className="page-heading"><div><h1>Make it feel like you.</h1><p>Language, memory, and the boundaries of your workspace.</p></div></div><div className="settings-layout"><section><h2>Conversation preferences</h2><label className="setting-row">Response language<select value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="auto">Follow my language</option><option value="en">English</option><option value="hi">हिन्दी</option><option value="te">తెలుగు</option></select></label><label className="setting-row">Enable explicit memory<input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/></label><label className="setting-row">Browser speech fallback<input type="checkbox" checked={speech} onChange={e=>setSpeech(e.target.checked)}/></label><p className="quiet">Only an installed voice matching the response language is used. Browser speech availability varies by device. Provider selection is controlled on the server to protect budgets.</p><button className="primary" onClick={()=>void saveSettings()}>Save preferences</button></section><section><h2>{localUrl?'Local identity':'Your account'}</h2>{localUrl?<><p>A local access key enables persistent memory on this computer. Leave empty for an isolated guest session.</p><input type="password" aria-label="Local access key" value={localKey} onChange={e=>setLocalKey(e.target.value)} placeholder="LOCAL_API_KEY" autoComplete="off"/><p className="quiet">Kept only in this page’s memory. Enter before starting a session.</p></>:signedIn?<><p>You are signed in. Memory remains private to your account.</p><button className="secondary" onClick={async()=>{await end();await client.current?.auth.signOut();setMemories([]);setHistory([]);setNotice('Signed out.');}}>Sign out</button></>:<><p>Sign in with an email link to keep memory and conversation history across sessions.</p><input type="email" aria-label="Email address" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/><button className="secondary" onClick={()=>void signIn()} disabled={!email}>Send sign-in link<ArrowUpRight size={16}/></button></>}<h2 className="privacy-heading">Privacy by default</h2><p>No raw audio is stored by this application. Inference providers process speech and prompts under their own policies. Anonymous records expire; long-term memory requires your consent.</p></section></div></>}
    </div><div ref={audioContainer} className="audio-output"/></main>
  </div>;
}

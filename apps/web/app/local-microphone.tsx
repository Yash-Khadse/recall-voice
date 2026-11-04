'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Square} from 'lucide-react';
export default function LocalMicrophone({url,token,language,onTranscript,onError}:{url:string;token:string;language:string;onTranscript:(text:string)=>void;onError:(error:string)=>void}){
 const [recording,setRecording]=useState(false);const [transcribing,setTranscribing]=useState(false);
 const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);if(recorder.current){recorder.current.onstop=null;if(recorder.current.state==='recording')recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());controller.current?.abort();},[]);
 async function toggle(){
  if(recording){recorder.current?.stop();return;}
  try{window.speechSynthesis?.cancel();stream.current=await navigator.mediaDevices.getUserMedia({audio:true});
   const audio=new MediaRecorder(stream.current);recorder.current=audio;const chunks:Blob[]=[];
   audio.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   audio.onstop=async()=>{if(timer.current)clearTimeout(timer.current);stream.current?.getTracks().forEach(t=>t.stop());setRecording(false);setTranscribing(true);
    try{controller.current=new AbortController();const response=await fetch(`${url}/transcribe?language=${language}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':audio.mimeType},body:new Blob(chunks,{type:audio.mimeType}),signal:controller.current.signal});const data=await response.json();if(!response.ok)throw new Error(data.detail||'Speech recognition failed');onTranscript(data.text);}catch(error){if(error instanceof Error&&error.name!=='AbortError')onError(error.message);}finally{setTranscribing(false);}};
   audio.start();setRecording(true);timer.current=setTimeout(()=>{if(audio.state==='recording')audio.stop();},30000);
  }catch(error){stream.current?.getTracks().forEach(t=>t.stop());onError(error instanceof Error?error.message:'Microphone unavailable. Continue with text.');}
 }
 return <button onClick={()=>void toggle()} disabled={transcribing} title="Local CPU speech: record a turn, then review and send its transcript">{recording?<Square size={15}/>:<Mic size={17}/>} {transcribing?'Transcribing…':recording?'Stop recording':'Record a turn'}</button>;
}

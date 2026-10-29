import {useEffect,useState} from 'react';
import {useAuth} from '@/lib/auth-context';
export function useServerTime(interval=1000) {
  const {serverClock}=useAuth();
  const [,tick]=useState(0);
  useEffect(()=>{const timer=setInterval(()=>tick(x=>x+1),interval);return()=>clearInterval(timer);},[interval]);
  return serverClock.timestamp+performance.now()-serverClock.receivedAt;
}

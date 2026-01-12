import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Peer from 'peerjs';
import io from 'socket.io-client';
import Chat from './Chat';

const socket = io('https://watch-party-server-1o5x.onrender.com', { withCredentials: true, autoConnect: true });

export default function Viewer() {
  const { roomId } = useParams();
  
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [showChat, setShowChat] = useState(true);
  
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false); 
  const [isKicked, setIsKicked] = useState(false);

  const videoRef = useRef();
  const myPeer = useRef();
  const nameInputRef = useRef();
  const retryInterval = useRef(null);
  const receivingCall = useRef(false);
  
  const hostState = useRef({ type: 'PAUSE', time: 0 }); 
  const isWatching = useRef(false);
  const isLocallyPaused = useRef(false); 
  const isRemoteUpdate = useRef(false); 

  const handleLogin = (e) => {
      e.preventDefault();
      const name = nameInputRef.current.value;
      if(name.trim()) { setUsername(name); setIsLoggedIn(true); }
  };

  useEffect(() => {
    if(!isLoggedIn) return;

    myPeer.current = new Peer(undefined, {
      host: 'watch-party-server-1o5x.onrender.com',
      port: 443,
      secure: true,
      path: '/peerjs' 
    });
    
    myPeer.current.on('open', (id) => {
      setStatus("Waiting for Host...");
      socket.emit('join-room', roomId, id, username); 
      
      retryInterval.current = setInterval(() => {
          if(!receivingCall.current) {
             console.log("Pinging Host...");
             socket.emit('join-room', roomId, id, username); 
          }
      }, 2000);
    });

    myPeer.current.on('call', (call) => {
      if (receivingCall.current) return;
      receivingCall.current = true;
      clearInterval(retryInterval.current);
      
      setIsEnded(false); 

      call.answer(); 
      call.on('stream', (hostStream) => {
        if(videoRef.current) {
            videoRef.current.srcObject = hostStream;
            
            // ✅ NEW STRATEGY: Play immediately (muted) to prevent deadlock
            videoRef.current.muted = true;
            videoRef.current.play().catch(e => console.log("Autoplay waiting for user interaction..."));

            setStatus("Ready to Join");
            setShowPlayButton(true);
        }
      });
    });

    socket.on('kicked', () => {
        setIsKicked(true);
        isWatching.current = false;
        if(videoRef.current) videoRef.current.pause();
        if(myPeer.current) myPeer.current.destroy();
        socket.emit('leave-room');
    });

    socket.on('stream-forced-refresh', () => {
        setIsEnded(false);
        receivingCall.current = false;
        if(myPeer.current) socket.emit('join-room', roomId, myPeer.current.id, username);
    });

    socket.on('video-sync', (data) => {
        hostState.current = data; 
        
        if (videoRef.current && isWatching.current) {
            if(Math.abs(videoRef.current.currentTime - data.time) > 0.5) {
                videoRef.current.currentTime = data.time;
            }

            isRemoteUpdate.current = true;

            if(data.type === 'PAUSE') {
                videoRef.current.pause();
                setIsPaused(true);
                setStatus("Host Paused");
                socket.emit('viewer-status-update', { roomId, status: 'PAUSE' });
            } else if(data.type === 'PLAY') {
                setIsPaused(false);
                setStatus("LIVE");
                
                if (!isLocallyPaused.current) {
                    videoRef.current.play().catch(() => {});
                    socket.emit('viewer-status-update', { roomId, status: 'LIVE' });
                } else {
                    socket.emit('viewer-status-update', { roomId, status: 'PAUSE' });
                }
            }
            
            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        }
    });

    socket.on('broadcast-stopped', () => {
        setIsEnded(true);
        setStatus("Host Disconnected");
        isWatching.current = false; 
        receivingCall.current = false;
        if(videoRef.current) videoRef.current.srcObject = null;
    });

    return () => {
      socket.emit('leave-room'); 
      clearInterval(retryInterval.current);
      socket.off('video-sync');
      socket.off('broadcast-stopped');
      socket.off('stream-forced-refresh');
      socket.off('kicked');
      if(myPeer.current) myPeer.current.destroy();
    };
  }, [isLoggedIn, roomId]);

  const onVideoPlay = () => {
      if (isRemoteUpdate.current) return;
      isLocallyPaused.current = false;
      socket.emit('viewer-status-update', { roomId, status: 'LIVE' });
  };

  const onVideoPause = () => {
      if (isRemoteUpdate.current) return;
      isLocallyPaused.current = true;
      socket.emit('viewer-status-update', { roomId, status: 'PAUSE' });
  };

  // ✅ SIMPLIFIED JOIN LOGIC (Impossible to freeze)
  const handleManualPlay = () => {
    if (!videoRef.current) return;

    // 1. Hide Button INSTANTLY
    setShowPlayButton(false);
    setStatus("Connected");
    isWatching.current = true; 
    isRemoteUpdate.current = true;

    // 2. Unmute the video (It's already playing in background)
    videoRef.current.muted = false;

    // 3. Sync State
    const { type, time } = hostState.current;
    if (Number.isFinite(time)) videoRef.current.currentTime = time;

    if (type === 'PAUSE') {
        videoRef.current.pause();
        setIsPaused(true);
        setStatus("Host Paused");
        isLocallyPaused.current = false; 
        socket.emit('viewer-status-update', { roomId, status: 'PAUSE' });
    } else {
        setIsPaused(false);
        setStatus("LIVE");
        isLocallyPaused.current = false;
        socket.emit('viewer-status-update', { roomId, status: 'LIVE' });
        
        // Force play one last time to be sure
        videoRef.current.play().catch(e => console.log("Final play check", e));
    }

    setTimeout(() => { isRemoteUpdate.current = false; }, 200);
  };

  if (isKicked) {
      return (
          <div className="flex h-screen w-screen bg-black items-center justify-center font-sans">
              <div className="text-center p-10 border border-red-900 rounded-2xl bg-neutral-900 shadow-2xl">
                  <div className="text-6xl mb-4">🚫</div>
                  <h1 className="text-3xl font-bold text-red-500 mb-2">You have been kicked</h1>
                  <Link to="/" className="mt-6 inline-block px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-bold transition">Return Home</Link>
              </div>
          </div>
      );
  }

  if (!isLoggedIn) {
      return (
          <div className="flex h-screen w-screen bg-black items-center justify-center font-sans relative">
              <div className="absolute top-6 left-6"><Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2 transition"><span className="text-xl">🏠</span> <span className="font-bold">Back Home</span></Link></div>
              <form onSubmit={handleLogin} className="bg-neutral-900 p-10 rounded-2xl border border-neutral-800 flex flex-col gap-6 w-96 shadow-2xl">
                  <div className="text-center"><h1 className="text-3xl font-bold text-center text-blue-500 tracking-wider mb-2">JOINING</h1><p className="text-gray-400 text-sm">Room: <span className="font-mono text-white">{roomId}</span></p></div>
                  <div className="flex flex-col gap-2"><label className="text-gray-400 text-xs uppercase tracking-wide font-bold">Your Name</label><input ref={nameInputRef} type="text" placeholder="Enter your name" className="bg-black border border-neutral-700 text-white px-4 py-3 rounded-lg focus:border-blue-500 outline-none transition" autoFocus /></div>
                  <button type="submit" className="bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-lg transition transform active:scale-95">Enter Room</button>
              </form>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-black overflow-hidden font-sans">
      <div className="h-14 flex items-center justify-between px-6 bg-neutral-900 border-b border-neutral-800 shrink-0 z-20">
         <div className="flex items-center gap-6"><Link to="/" className="flex items-center gap-2 group"><span className="text-xl group-hover:scale-110 transition">🏠</span><h1 className="text-lg font-bold tracking-tighter hidden md:block"><span className="text-blue-500">WATCH</span><span className="text-white">PARTY</span></h1></Link><div className="h-6 w-px bg-neutral-700 hidden md:block"></div><div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Connected To</span><span className="text-sm font-mono text-white leading-none">{roomId}</span></div></div>
         <div className="flex items-center gap-3">
             {!showChat && !isEnded && <button onClick={() => setShowChat(true)} className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded border border-neutral-700 transition flex items-center gap-2"><span>💬</span> Chat</button>}
             <div className={`px-3 py-1 bg-black border border-neutral-700 rounded-full`}><span className={`text-xs font-bold uppercase ${isEnded ? 'text-red-500' : status === 'LIVE' ? 'text-green-500 animate-pulse' : 'text-blue-400'}`}>{status}</span></div>
         </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-row relative overflow-hidden">
        <div className="flex-1 bg-black flex items-center justify-center relative min-w-0">
          <video 
            ref={videoRef} 
            controls 
            className="w-full h-full object-contain" 
            onPause={onVideoPause} 
            onPlay={onVideoPlay} 
          />
          {showPlayButton && !isEnded && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80">
              <div className="bg-neutral-900 p-8 rounded-xl border border-neutral-700 flex flex-col items-center gap-4 shadow-2xl">
                <h2 className="text-xl font-bold text-white">Stream Ready</h2>
                <button onClick={handleManualPlay} className="bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition transform active:scale-95">Join Watch Party</button>
              </div>
            </div>
          )}
          {isPaused && !isEnded && !showPlayButton && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="bg-black/40 p-6 rounded-full backdrop-blur-sm"><svg className="w-12 h-12 text-white/80 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg></div></div>
          )}
          {isEnded && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-zinc-900">
                <div className="text-center p-10 border border-zinc-700 rounded-2xl bg-black shadow-2xl">
                    <div className="text-6xl mb-4">💤</div>
                    <h1 className="text-3xl font-bold text-white mb-2">Host Offline</h1>
                    <p className="text-gray-400">Waiting for host to reconnect...</p>
                </div>
            </div>
          )}
        </div>
        <div className={`${showChat ? 'block' : 'hidden'} h-full`}><Chat socket={socket} roomId={roomId} toggleChat={() => setShowChat(false)} username={username} /></div>
      </div>
    </div>
  );
}

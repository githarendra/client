import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Peer from 'peerjs';
import io from 'socket.io-client';
import Chat from './Chat';

// ✅ Allow default transports to let Socket.IO negotiate the best connection
const socket = io('https://watch-party-server-1o5x.onrender.com', { 
    withCredentials: true,
    autoConnect: true 
});

export default function Host() {
  const { roomId } = useParams();
  const [username, setUsername] = useState(""); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState("Offline");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [fileSelected, setFileSelected] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [inviteCopied, setInviteCopied] = useState(false);
  
  const videoRef = useRef();
  const myPeer = useRef();
  const streamRef = useRef(null);
  const nameInputRef = useRef();
  const calledPeers = useRef({});

  useEffect(() => {
      return () => {
          socket.emit('leave-room');
          if (isBroadcasting) socket.emit('stop-broadcast', roomId);
      };
  }, [isBroadcasting, roomId]);

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
      setStatus("Connected");
      socket.emit('join-room', roomId, id, username);
      socket.emit('host-joined', { roomId, username });
    });

    socket.on('update-user-list', (updatedUsers) => {
        setUsers(updatedUsers.filter(u => u.username !== username));
    });
    
    const handleMessage = (data) => {
        setMessages((prev) => [...prev, { ...data, isMe: false }]);
    };
    socket.on('receive-message', handleMessage);
    
    // ✅ 1. Reply with Sync Data
    socket.on('ask-sync-data', (requesterId) => {
        if(videoRef.current) {
            const state = videoRef.current.paused ? 'PAUSE' : 'PLAY';
            socket.emit('video-sync', { 
                roomId, 
                type: state, 
                time: videoRef.current.currentTime,
                targetSocketId: requesterId 
            });
        }
    });

    // ✅ 2. Reply with Host Name
    socket.on('ask-host-name', (requesterId) => {
        socket.emit('return-host-name', { targetSocketId: requesterId, name: username });
    });

    socket.on('user-connected', (userId) => {
      if (streamRef.current) {
          connectToNewUser(userId, streamRef.current);
      }
    });

    return () => {
        socket.off('user-connected');
        socket.off('update-user-list');
        socket.off('receive-message');
        socket.off('ask-sync-data');
        socket.off('ask-host-name');
        if(myPeer.current) myPeer.current.destroy();
    }
  }, [isLoggedIn, roomId]);

  const connectToNewUser = (userId, stream) => {
      if (calledPeers.current[userId]) return;
      calledPeers.current[userId] = true;
      setTimeout(() => {
          try {
              myPeer.current.call(userId, stream);
              setTimeout(() => { calledPeers.current[userId] = false; }, 2000); 
          } catch(err) { calledPeers.current[userId] = false; }
      }, 500); 
  };

  const handleKick = (socketId, userName) => {
      if(window.confirm(`Kick ${userName}?`)) socket.emit('kick-user', { roomId, socketId });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileSelected(true);
      setTimeout(() => { if(videoRef.current) { videoRef.current.src = url; setStatus("Ready"); }}, 50);
    }
  };

  const handleShare = () => {
      const inviteUrl = `${window.location.origin}/viewer/${roomId}`;
      navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
  };

  const startBroadcast = async () => {
    const video = videoRef.current; if (!video) return;
    try { 
        video.muted = false;
        let stream;
        if (video.captureStream) stream = video.captureStream(30);
        else if (video.mozCaptureStream) stream = video.mozCaptureStream(30);
        else throw new Error("Browser not supported.");
        
        streamRef.current = stream; 
        setIsBroadcasting(true); 
        setStatus("LIVE"); 
        
        socket.emit('host-joined', { roomId, username });
        socket.emit('video-sync', { roomId, type: 'PAUSE', time: video.currentTime });

    } catch (err) { alert(err.message); }
  };

  const stopBroadcast = () => {
    socket.emit('stop-broadcast', roomId); 
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    setIsBroadcasting(false); setStatus("Stopped");
  };
  
  const handleSync = (type) => { 
      if(videoRef.current) {
          socket.emit('video-sync', { roomId, type, time: videoRef.current.currentTime }); 
          if(isBroadcasting) {
              setStatus(type === 'PLAY' ? "LIVE" : "PAUSED");
          }
      }
  };

  const getDotColor = () => {
      if (status === 'LIVE') return 'bg-green-500 animate-pulse';
      if (status === 'PAUSED') return 'bg-yellow-500';
      return 'bg-zinc-600';
  }

  if (!isLoggedIn) {
      return (
          <div className="flex h-screen w-screen bg-black items-center justify-center font-sans relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black"></div>
              <div className="absolute top-6 left-6 z-10"><Link to="/" className="text-zinc-400 hover:text-white flex items-center gap-2 transition group"><span className="text-xl group-hover:-translate-x-1 transition">←</span> <span className="font-bold">Home</span></Link></div>
              <form onSubmit={handleLogin} className="z-10 bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl border border-white/10 flex flex-col gap-6 w-96 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                  <div className="text-center"><h1 className="text-3xl font-bold text-white tracking-tight mb-2">Host Party</h1></div>
                  <div className="flex flex-col gap-2 text-left"><label className="text-zinc-400 text-xs uppercase tracking-wide font-bold ml-1">Your Alias</label><input ref={nameInputRef} type="text" placeholder="e.g. Host Harry" className="bg-black/50 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:border-violet-500 outline-none transition" autoFocus /></div>
                  <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/20">Start Hosting</button>
              </form>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white overflow-hidden font-sans">
      <div className="h-16 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 shrink-0 z-20">
        <div className="flex items-center gap-6"><Link to="/" className="flex items-center gap-3 group"><div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white group-hover:scale-110 transition">P</div><h1 className="text-lg font-bold tracking-tight text-zinc-200 group-hover:text-white transition">Party<span className="text-violet-500">Time</span></h1></Link><div className="h-6 w-px bg-white/10 hidden md:block"></div><div className="flex flex-col"><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Room ID</span><span className="text-sm font-mono text-zinc-300 leading-none">{roomId}</span></div></div>
        <div className="flex gap-3 items-center">
            <button onClick={handleShare} className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition font-bold text-sm ${inviteCopied ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-300'}`}><span>{inviteCopied ? '✅' : '🔗'}</span><span>{inviteCopied ? 'Copied!' : 'Share'}</span></button>
            <button onClick={() => setShowUserPanel(!showUserPanel)} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-full transition"><span className="text-sm">👥 {users.length}</span></button>
            <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-full flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getDotColor()}`}></div>
                <span className="text-xs font-bold uppercase text-zinc-400">{status}</span>
            </div>
            {!showChat && <button onClick={() => setShowChat(true)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full border border-white/10 transition text-zinc-400 hover:text-white">💬</button>}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-row relative overflow-hidden bg-black/90">
        <div className="flex-1 flex flex-col relative min-w-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-100">
          {showUserPanel && (
            <div className="absolute top-4 right-4 z-50 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[70%] animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-white text-sm">Viewers ({users.length})</h3><button onClick={() => setShowUserPanel(false)} className="text-zinc-500 hover:text-white transition">✕</button></div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {users.map(u => (
                        <div key={u.socketId} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold">{u.username[0]}</div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-zinc-200">{u.username}</span>
                                    <span className={`text-[10px] font-bold uppercase ${u.status === 'LIVE' ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {u.status === 'LIVE' ? '▶ Watching' : '⏸ Paused'}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => handleKick(u.socketId, u.username)} className="text-xs text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 px-2 py-1 rounded transition">Kick</button>
                        </div>
                    ))}
                </div>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center bg-black w-full h-full overflow-hidden relative">
            {!fileSelected ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800/30 via-black to-black"><div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/5"><span className="text-6xl">🎬</span></div><h2 className="text-2xl font-bold text-white mb-2">Ready to Stream?</h2><p className="text-zinc-500">Select a video file to begin.</p></div>
            ) : (
                <video ref={videoRef} controls className="w-full h-full object-contain" onPause={() => handleSync('PAUSE')} onPlay={() => handleSync('PLAY')} />
            )}
          </div>
        </div>
        {showChat && <Chat socket={socket} roomId={roomId} toggleChat={() => setShowChat(false)} username={username} messages={messages} setMessages={setMessages} />}
      </div>
      <div className="h-24 flex items-center justify-center gap-6 bg-zinc-950 border-t border-white/5 shrink-0 z-50">
        <label className={`cursor-pointer group flex items-center justify-center gap-3 w-80 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 transition shadow-lg ${isBroadcasting ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-2xl group-hover:scale-110 transition">📂</span><div className="flex flex-col items-start"><span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Source Media</span><span className="text-sm font-bold text-white truncate max-w-[150px]">{fileSelected ? "Video Loaded" : "Select File"}</span></div><input type="file" accept="video/mp4,video/webm" onChange={handleFileChange} className="hidden" disabled={isBroadcasting} />
        </label>
        {!isBroadcasting ? (
            <button onClick={startBroadcast} disabled={!fileSelected} className={`w-80 h-16 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-3 ${fileSelected ? 'bg-violet-600 hover:bg-violet-500 text-white hover:scale-105 shadow-violet-900/20' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}><span className="text-xl">📡</span><div className="flex flex-col items-start"><span className="text-[10px] opacity-70 font-bold uppercase tracking-wider">Action</span><span>Start Broadcast</span></div></button>
        ) : (
            <button onClick={stopBroadcast} className="w-80 h-16 rounded-2xl font-bold text-sm transition-all bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white flex items-center justify-center gap-3 animate-pulse"><span className="text-xl">⏹</span><div className="flex flex-col items-start"><span className="text-[10px] opacity-70 font-bold uppercase tracking-wider">Live</span><span>Stop Broadcast</span></div></button>
        )}
      </div>
    </div>
  );
}

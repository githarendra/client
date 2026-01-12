import React, { useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export default function Chat({ socket, roomId, toggleChat, username, messages, setMessages }) {
  const [msg, setMsg] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      const messageData = { 
        roomId, 
        username: username || "Guest", 
        text: msg, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      socket.emit('send-message', messageData);
      setMessages((prev) => [...prev, { ...messageData, isMe: true }]);
      setMsg("");
      setShowEmoji(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    setMsg((prev) => prev + emojiData.emoji);
  };

  return (
    <div className="flex flex-col h-full w-80 bg-black/60 backdrop-blur-xl border-l border-white/10 shadow-2xl z-40 relative shrink-0 transition-all duration-300 ease-in-out">
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-10 shadow-lg shadow-black/20">
        <div>
          <h2 className="text-white font-bold text-sm tracking-wide drop-shadow-md">Live Chat</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Online</span>
          </div>
        </div>
        <button 
          onClick={toggleChat} 
          className="text-zinc-400 hover:text-white transition-all hover:bg-white/10 p-2 rounded-full active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-60 animate-in fade-in duration-700">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3">
                <span className="text-3xl">👋</span>
            </div>
            <p className="text-sm font-medium">No messages yet.</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
            {!m.isMe && <span className="text-[10px] text-zinc-400 ml-3 mb-1 font-bold tracking-wide">{m.username}</span>}
            <div className={`max-w-[85%] px-4 py-2.5 text-sm shadow-lg relative break-words leading-relaxed ${m.isMe ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-tr-sm shadow-violet-900/20' : 'bg-zinc-800/80 backdrop-blur-sm border border-white/5 text-zinc-100 rounded-2xl rounded-tl-sm'}`}>
              <p>{m.text}</p>
            </div>
            <span className={`text-[9px] text-zinc-600 mt-1 px-1 select-none font-medium ${m.isMe ? 'mr-1' : 'ml-1'}`}>{m.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-lg relative">
        {/* ✅ FIXED: Full Native Emoji Picker */}
        {showEmoji && (
          <div className="absolute bottom-full mb-4 left-0 z-50 animate-in slide-in-from-bottom-5 duration-200 shadow-2xl rounded-xl overflow-hidden border border-white/10">
            <EmojiPicker 
                theme={Theme.DARK} 
                emojiStyle="native" // 🌈 This forces colorful emojis!
                onEmojiClick={onEmojiClick}
                width={300}
                height={400}
                lazyLoadEmojis={true}
            />
          </div>
        )}

        <form onSubmit={sendMessage} className="relative flex items-center gap-2">
          <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 flex-shrink-0 ${showEmoji ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
            {showEmoji ? '✕' : '😀'}
          </button>
          
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-900/50 text-white border border-zinc-700/50 rounded-full py-2.5 px-4 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 text-sm transition-all placeholder-zinc-600 hover:border-zinc-600"
          />
          
          <button type="submit" disabled={!msg.trim()} className="w-10 h-10 flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-all disabled:opacity-0 disabled:scale-75 disabled:pointer-events-none transform active:scale-90 shadow-lg shadow-violet-900/30 flex-shrink-0">
            <svg className="w-5 h-5 translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}

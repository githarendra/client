import React, { useEffect, useState, useRef } from 'react';

export default function Chat({ socket, roomId, toggleChat, username }) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleReceive = (data) => setMessages((prev) => [...prev, data]);
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      const messageData = { roomId, username: username || "Anon", text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: true };
      socket.emit('send-message', messageData);
      setMessages((prev) => [...prev, messageData]);
      setMsg("");
    }
  };

  return (
    <div className="flex flex-col h-full w-80 bg-zinc-950 border-l border-white/10 shadow-2xl z-40">
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md">
        <h2 className="text-white font-bold text-sm">Live Chat</h2>
        <button onClick={toggleChat} className="text-zinc-500 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm ${m.isMe ? 'bg-violet-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'}`}>
              {!m.isMe && <span className="block text-[10px] text-violet-300 font-bold mb-1 opacity-80">{m.username}</span>}
              <p>{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-3 bg-zinc-900 border-t border-white/10">
        <div className="relative flex items-center">
          <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message..." className="w-full bg-black/50 text-white border border-zinc-800 rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:border-violet-500 text-sm" />
          <button type="submit" disabled={!msg.trim()} className="absolute right-1 p-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition disabled:opacity-0">➤</button>
        </div>
      </form>
    </div>
  );
}

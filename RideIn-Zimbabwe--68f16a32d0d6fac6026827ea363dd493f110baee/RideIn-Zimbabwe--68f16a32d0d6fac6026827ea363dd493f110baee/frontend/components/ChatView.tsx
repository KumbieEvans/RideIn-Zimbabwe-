
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserRole } from '../types';
import { ablyService } from '../services/ably';

interface ChatViewProps {
  tripId: string;
  currentUserId: string;
  partnerName: string;
  onClose: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ tripId, currentUserId, partnerName, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chat history or system message
    setMessages([
      { 
        id: 'sys_1', 
        senderId: 'system', 
        text: `You are connected with ${partnerName}. Please coordinate your pickup safely.`, 
        timestamp: new Date().toISOString(), 
        isSystem: true 
      }
    ]);

    // Subscribe to incoming messages
    ablyService.subscribeToChat(tripId, (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev; // Dedupe
        return [...prev, msg];
      });
    });

    return () => {
      // Fix: Unsubscribe using the correct channel name pattern defined in AblyService
      ablyService.unsubscribe(`ride:${tripId}:chat`);
    };
  }, [tripId, partnerName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUserId,
      text: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    // Optimistic Update
    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Send to Network
    await ablyService.sendChatMessage(tripId, newMsg);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-white px-6 py-4 pt-12 shadow-sm border-b border-gray-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-slate-800 hover:bg-gray-100 transition-colors">
            <i className="fa-solid fa-chevron-down"></i>
          </button>
          <div>
            <h3 className="font-bold text-slate-900 text-lg leading-none">{partnerName}</h3>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1 mt-1">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
            </span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-brand-blue">
            <i className="fa-solid fa-phone"></i>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const isSystem = msg.isSystem;

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="bg-gray-200/50 text-gray-500 text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[75%] px-5 py-3 rounded-2xl text-sm font-normal shadow-sm ${
                 isMe 
                   ? 'bg-brand-blue text-white rounded-tr-none' 
                   : 'bg-white text-slate-800 border border-gray-100 rounded-tl-none'
               }`}>
                 {msg.text}
                 <div className={`text-[9px] mt-1 text-right opacity-60 font-bold ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </div>
               </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 safe-bottom">
         <form onSubmit={handleSend} className="relative flex items-center gap-3">
             <input 
               type="text" 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               placeholder="Type a message..."
               className="flex-1 bg-gray-100 text-slate-900 placeholder-gray-400 px-5 py-4 rounded-full font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all"
             />
             <button 
               type="submit" 
               disabled={!inputText.trim()}
               className="w-12 h-12 bg-brand-orange text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-orange/30 active:scale-95 transition-transform disabled:opacity-50 disabled:shadow-none"
             >
               <i className="fa-solid fa-paper-plane text-sm"></i>
             </button>
         </form>
      </div>
    </div>
  );
};

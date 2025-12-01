import React, { useState, useEffect, useRef } from 'react';
import { Ticket, TicketStatus, Remark } from '../types';
import { generateResponseSuggestion } from '../services/geminiService';

interface TicketDetailProps {
  ticket: Ticket | null;
  onUpdateTicket: (updatedTicket: Ticket) => void;
  currentUser: string;
}

const statusOptions = Object.values(TicketStatus);

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, onUpdateTicket, currentUser }) => {
  const [remarkText, setRemarkText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.remarks]);

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-8">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-lg font-medium">Select a ticket to view details</p>
      </div>
    );
  }

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (newStatus === ticket.status) return;
    
    const statusRemark: Remark = {
      id: Math.random().toString(36).substr(2, 9),
      author: currentUser,
      text: `Status changed from ${ticket.status} to ${newStatus}`,
      timestamp: Date.now(),
      type: 'status_change'
    };

    const updatedTicket = {
      ...ticket,
      status: newStatus,
      updatedAt: Date.now(),
      remarks: [...ticket.remarks, statusRemark]
    };
    onUpdateTicket(updatedTicket);
  };

  const handleAddRemark = () => {
    if (!remarkText.trim()) return;

    const newRemark: Remark = {
      id: Math.random().toString(36).substr(2, 9),
      author: currentUser,
      text: remarkText,
      timestamp: Date.now(),
      type: 'remark'
    };

    const updatedTicket = {
      ...ticket,
      updatedAt: Date.now(),
      remarks: [...ticket.remarks, newRemark]
    };

    onUpdateTicket(updatedTicket);
    setRemarkText('');
  };

  const handleAIAssist = async () => {
    setIsGenerating(true);
    const suggestion = await generateResponseSuggestion(ticket);
    setRemarkText(suggestion);
    setIsGenerating(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-mono text-gray-500">#{ticket.id}</span>
             <span className="text-xs text-gray-400">• {new Date(ticket.createdAt).toLocaleString()}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 truncate">{ticket.title}</h1>
          <p className="text-sm text-gray-600 mt-1">Customer: <span className="font-medium text-gray-800">{ticket.customerName}</span></p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Status:</label>
          <select 
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
            className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white border"
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: Description + History */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth" ref={scrollRef}>
        {/* Description Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Complaint Details</h3>
          <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Timeline */}
        <div className="relative">
           <div className="absolute top-0 bottom-0 left-4 w-px bg-gray-200"></div>
           <div className="space-y-6">
             {ticket.remarks.map((remark) => (
               <div key={remark.id} className="relative pl-10">
                 <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-white transform -translate-x-1/2 
                   ${remark.type === 'status_change' ? 'bg-indigo-400' : remark.type === 'action' ? 'bg-gray-400' : 'bg-blue-500'}`} 
                 />
                 <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                   <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                       <span className={`font-semibold text-sm ${remark.type === 'status_change' ? 'text-indigo-600' : 'text-gray-900'}`}>
                         {remark.author}
                       </span>
                       <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 uppercase tracking-wider">
                         {remark.type.replace('_', ' ')}
                       </span>
                     </div>
                     <span className="text-xs text-gray-400">{new Date(remark.timestamp).toLocaleString()}</span>
                   </div>
                   <p className="text-gray-700 text-sm whitespace-pre-wrap">{remark.text}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Add Update</h4>
            <button
              onClick={handleAIAssist}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors 
                ${isGenerating ? 'bg-purple-100 text-purple-400 cursor-not-allowed' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'}`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Thinking...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Generate Response (AI)
                </>
              )}
            </button>
          </div>
          <div className="flex gap-3">
            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Type your remark or action taken..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-sm h-24"
            />
            <button
              onClick={handleAddRemark}
              disabled={!remarkText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-6 rounded-lg transition-colors self-end h-10 flex items-center"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

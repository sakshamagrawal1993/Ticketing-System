import React from 'react';
import { Ticket, TicketStatus } from '../types';

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticket: Ticket) => void;
  filterStatus: TicketStatus | 'All';
  onFilterChange: (status: TicketStatus | 'All') => void;
}

const statusColors: Record<TicketStatus, string> = {
  [TicketStatus.Open]: 'bg-blue-100 text-blue-800',
  [TicketStatus.InProgress]: 'bg-yellow-100 text-yellow-800',
  [TicketStatus.Resolved]: 'bg-green-100 text-green-800',
  [TicketStatus.Closed]: 'bg-gray-100 text-gray-800',
};

export const TicketList: React.FC<TicketListProps> = ({ tickets, selectedTicketId, onSelectTicket, filterStatus, onFilterChange }) => {
  const filteredTickets = filterStatus === 'All' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80 lg:w-96 flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Tickets</h2>
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          <button 
            onClick={() => onFilterChange('All')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === 'All' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {Object.values(TicketStatus).map(status => (
            <button 
              key={status}
              onClick={() => onFilterChange(status)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No tickets found</div>
        ) : (
          filteredTickets.map(ticket => (
            <div 
              key={ticket.id}
              onClick={() => onSelectTicket(ticket)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedTicketId === ticket.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${statusColors[ticket.status]}`}>
                  {ticket.status}
                </span>
                <span className="text-xs text-gray-400">{formatDate(ticket.updatedAt)}</span>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate">{ticket.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{ticket.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">{ticket.customerName}</span>
                <span className="text-[10px] text-gray-400">ID: {ticket.id.slice(0,6)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

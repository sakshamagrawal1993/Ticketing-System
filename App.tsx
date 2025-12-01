import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { TicketList } from './components/TicketList';
import { TicketDetail } from './components/TicketDetail';
import { StatsView } from './components/StatsView';
import { CreateTicketModal } from './components/CreateTicketModal';
import { Ticket, TicketStatus, User, ViewMode } from './types';
import { getTickets, saveTicket, createNewTicket } from './services/storageService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'All'>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    setTickets(getTickets());
  }, []);

  const handleLogin = (username: string) => {
    setUser({ username, role: 'operator' });
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    saveTicket(updatedTicket);
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
  };

  const handleCreateTicket = (title: string, description: string, customerName: string) => {
    const newTicket = createNewTicket(title, description, customerName);
    setTickets(prev => [newTicket, ...prev]);
    setSelectedTicketId(newTicket.id);
    setViewMode('dashboard'); // Switch back to dashboard to see the new ticket
  };

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white text-gray-900">
      {/* Navbar */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
           <span className="text-xl font-bold tracking-tight text-gray-800">Ticketflow</span>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('analytics')}
             className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Analytics
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Create Ticket
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{user.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {viewMode === 'dashboard' ? (
          <>
            <TicketList 
              tickets={tickets}
              selectedTicketId={selectedTicketId}
              onSelectTicket={(t) => setSelectedTicketId(t.id)}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
            />
            <TicketDetail 
              ticket={selectedTicket}
              onUpdateTicket={handleUpdateTicket}
              currentUser={user.username}
            />
          </>
        ) : (
          <StatsView tickets={tickets} />
        )}
      </main>

      <CreateTicketModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTicket}
      />
    </div>
  );
};

export default App;

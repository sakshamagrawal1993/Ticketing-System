import React, { useMemo } from 'react';
import { Ticket, TicketStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface StatsViewProps {
  tickets: Ticket[];
}

export const StatsView: React.FC<StatsViewProps> = ({ tickets }) => {
  
  // Calculate stats
  const stats = useMemo(() => {
    const counts = {
      [TicketStatus.Open]: 0,
      [TicketStatus.InProgress]: 0,
      [TicketStatus.Resolved]: 0,
      [TicketStatus.Closed]: 0,
    };
    
    tickets.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    return [
      { name: 'Open', value: counts[TicketStatus.Open], color: '#3B82F6' }, // Blue
      { name: 'In Progress', value: counts[TicketStatus.InProgress], color: '#EAB308' }, // Yellow
      { name: 'Resolved', value: counts[TicketStatus.Resolved], color: '#22C55E' }, // Green
      { name: 'Closed', value: counts[TicketStatus.Closed], color: '#6B7280' }, // Gray
    ];
  }, [tickets]);

  const totalTickets = tickets.length;

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Analytics</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">{stat.name}</h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
              <div 
                className="h-2 w-2 rounded-full mb-2"
                style={{ backgroundColor: stat.color }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-96">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Ticket Volume by Status</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill: '#6B7280', fontSize: 12}} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{fill: '#F3F4F6'}}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-96">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Distribution</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={stats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Summary</h3>
        <p className="text-gray-600">
          Currently tracking <span className="font-bold text-gray-900">{totalTickets}</span> total tickets. 
          The majority are in <span className="font-bold">{stats.sort((a,b) => b.value - a.value)[0].name}</span> status.
        </p>
      </div>
    </div>
  );
};

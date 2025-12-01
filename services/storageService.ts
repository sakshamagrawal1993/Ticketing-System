import { Ticket, TicketStatus, Remark } from "../types";

const STORAGE_KEY = 'ticketflow_data';

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_DATA: Ticket[] = [
  {
    id: 't-101',
    title: 'Internet connection dropping intermittently',
    description: 'Customer reports that their fiber connection drops every 20 minutes specifically during zoom calls. Modem lights remain green.',
    customerName: 'Alice Johnson',
    status: TicketStatus.Open,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000,
    remarks: [
      { id: 'r-1', author: 'System', text: 'Ticket created', timestamp: Date.now() - 86400000 * 2, type: 'action' },
      { id: 'r-2', author: 'Operator', text: 'Asked customer for modem model number.', timestamp: Date.now() - 86400000 * 1.5, type: 'remark' }
    ]
  },
  {
    id: 't-102',
    title: 'Billing discrepancy for March',
    description: 'Charged $50 extra for a service not subscribed to.',
    customerName: 'Bob Smith',
    status: TicketStatus.Resolved,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 4,
    remarks: [
      { id: 'r-3', author: 'System', text: 'Ticket created', timestamp: Date.now() - 86400000 * 5, type: 'action' },
      { id: 'r-4', author: 'Operator', text: 'Refund processed.', timestamp: Date.now() - 86400000 * 4, type: 'remark' },
      { id: 'r-5', author: 'System', text: 'Status changed to Resolved', timestamp: Date.now() - 86400000 * 4, type: 'status_change' }
    ]
  },
  {
    id: 't-103',
    title: 'Feature request: Dark mode',
    description: 'User really wants a dark mode for the mobile app.',
    customerName: 'Charlie Davis',
    status: TicketStatus.InProgress,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    remarks: [
      { id: 'r-6', author: 'System', text: 'Ticket created', timestamp: Date.now() - 3600000, type: 'action' }
    ]
  }
];

export const getTickets = (): Ticket[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  return JSON.parse(data);
};

export const saveTicket = (ticket: Ticket): void => {
  const tickets = getTickets();
  const index = tickets.findIndex(t => t.id === ticket.id);
  if (index >= 0) {
    tickets[index] = ticket;
  } else {
    tickets.unshift(ticket);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
};

export const createNewTicket = (title: string, description: string, customerName: string): Ticket => {
  const newTicket: Ticket = {
    id: `t-${generateId()}`,
    title,
    description,
    customerName,
    status: TicketStatus.Open,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    remarks: [{
      id: `r-${generateId()}`,
      author: 'System',
      text: 'Ticket created',
      timestamp: Date.now(),
      type: 'action'
    }]
  };
  saveTicket(newTicket);
  return newTicket;
};

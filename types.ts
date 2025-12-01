export enum TicketStatus {
  Open = 'Open',
  InProgress = 'In Progress',
  Resolved = 'Resolved',
  Closed = 'Closed'
}

export interface Remark {
  id: string;
  author: string; // 'Operator' | 'System' | 'AI'
  text: string;
  timestamp: number;
  type: 'remark' | 'action' | 'status_change';
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  customerName: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  remarks: Remark[];
}

export interface User {
  username: string;
  role: 'admin' | 'operator';
}

export type ViewMode = 'dashboard' | 'analytics';

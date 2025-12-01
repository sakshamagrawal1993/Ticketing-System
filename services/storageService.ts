import { createClient } from '@supabase/supabase-js';
import { Ticket, TicketStatus, Remark, User } from "../types";

// Supabase Configuration
const SUPABASE_URL = 'https://ralhkmpbslsdkwnqzqen.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gMdAKFb5sgN89c7OzhIRdA_nrNGz3pP';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to handle date parsing from potential DB formats (ISO string or timestamp)
const parseTimestamp = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  }
  return Date.now();
};

const mapTicketFromDB = (data: any, remarks: any[]): Ticket => ({
  id: data.id,
  title: data.title,
  description: data.description,
  customerName: data.customer_name || 'Unknown',
  status: data.status as TicketStatus,
  createdAt: parseTimestamp(data.created_at),
  updatedAt: parseTimestamp(data.updated_at),
  remarks: remarks
    .filter(r => r.ticket_id === data.id)
    .map(mapRemarkFromDB)
    .sort((a, b) => a.timestamp - b.timestamp)
});

const mapRemarkFromDB = (data: any): Remark => ({
  id: data.id,
  author: data.author,
  text: data.text,
  timestamp: parseTimestamp(data.timestamp || data.created_at),
  type: data.type as any
});

// --- Main Service Methods ---

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      console.warn("Authentication failed:", error?.message);
      return null;
    }

    return {
      username: data.username,
      role: (data.role as 'admin' | 'operator') || 'operator'
    };
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
};

export const getTickets = async (): Promise<Ticket[]> => {
  try {
    // 1. Fetch Tickets from Supabase
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (ticketsError) throw ticketsError;

    // Strict DB only: If no tickets, return empty array.
    if (!ticketsData || ticketsData.length === 0) {
      return [];
    }

    // 2. Fetch Remarks
    const { data: remarksData, error: remarksError } = await supabase.from('remarks').select('*');
    if (remarksError) throw remarksError;

    // 3. Map and return
    return ticketsData.map(t => mapTicketFromDB(t, remarksData || [])).sort((a, b) => b.updatedAt - a.updatedAt);

  } catch (err: any) {
    console.error("Error fetching data from Supabase:", err.message || err);
    return [];
  }
};

export const saveTicket = async (ticket: Ticket): Promise<void> => {
  try {
    // Upsert Ticket
    const { error: tError } = await supabase
      .from('tickets')
      .upsert({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        customer_name: ticket.customerName,
        status: ticket.status,
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt
      });
    
    if (tError) throw tError;

    // Upsert Remarks
    const remarksPayload = ticket.remarks.map(r => ({
      id: r.id,
      ticket_id: ticket.id,
      author: r.author,
      text: r.text,
      timestamp: r.timestamp,
      type: r.type
    }));

    const { error: remarksError } = await supabase
      .from('remarks')
      .upsert(remarksPayload);

    if (remarksError) throw remarksError;

  } catch (err) {
    console.error("Failed to save to Supabase:", err);
    throw err;
  }
};

export const createNewTicket = async (title: string, description: string, customerName: string): Promise<Ticket> => {
  const ticketId = `t-${generateId()}`;
  const now = Date.now();
  
  const newTicket: Ticket = {
    id: ticketId,
    title,
    description,
    customerName,
    status: TicketStatus.Open,
    createdAt: now,
    updatedAt: now,
    remarks: [{
      id: `r-${generateId()}`,
      author: 'System',
      text: 'Ticket created',
      timestamp: now,
      type: 'action'
    }]
  };

  // Immediate save to DB
  await saveTicket(newTicket);
  return newTicket;
};
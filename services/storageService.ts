import { createClient } from '@supabase/supabase-js';
import { Ticket, TicketStatus, Remark } from "../types";

// Supabase Configuration
const SUPABASE_URL = 'https://ralhkmpbslsdkwnqzqen.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gMdAKFb5sgN89c7OzhIRdA_nrNGz3pP';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fallback Local Storage Key
const LOCAL_STORAGE_KEY = 'ticketflow_data_fallback';
let isFallbackMode = false;

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

// --- Local Storage Helpers ---

const getLocalTickets = (): Ticket[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalTickets = (tickets: Ticket[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tickets));
};

const seedLocalData = (): Ticket[] => {
  const statuses = [TicketStatus.Open, TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Closed];
  const tickets: Ticket[] = [];
  const now = Date.now();
  
  for (const status of statuses) {
    for (let i = 0; i < 6; i++) {
      const id = `t-${generateId()}`;
      // Random time in last 3 months
      const createdAt = now - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000);
      const updatedAt = createdAt + Math.floor(Math.random() * (now - createdAt));
      
      tickets.push({
        id,
        title: `${status} Ticket Issue #${i+1}`,
        description: `This is a generated ${status.toLowerCase()} ticket for testing purposes. It contains sample data to verify the dashboard analytics.`,
        customerName: `Customer ${Math.floor(Math.random() * 1000)}`,
        status,
        createdAt,
        updatedAt,
        remarks: [{
          id: `r-${generateId()}`,
          author: 'System',
          text: 'Ticket created',
          timestamp: createdAt,
          type: 'action'
        }]
      });
    }
  }
  saveLocalTickets(tickets);
  return tickets;
};

// --- Main Service Methods ---

export const getTickets = async (): Promise<Ticket[]> => {
  // If we already failed once, stick to local storage
  if (isFallbackMode) {
    const local = getLocalTickets();
    if (local.length === 0) return seedLocalData();
    return local;
  }

  try {
    const { data: ticketsData, error: ticketsError } = await supabase.from('tickets').select('*');
    
    if (ticketsError) {
      console.warn("Supabase fetch failed. This usually means the tables 'tickets' and 'remarks' do not exist in your Supabase project.");
      console.warn("Falling back to Local Storage mode.");
      console.warn("To use Supabase, run the following SQL in your Supabase SQL Editor:");
      console.log(`
        CREATE TABLE tickets (
          id text PRIMARY KEY,
          title text,
          description text,
          customer_name text,
          status text,
          created_at bigint,
          updated_at bigint
        );
        CREATE TABLE remarks (
          id text PRIMARY KEY,
          ticket_id text REFERENCES tickets(id),
          author text,
          text text,
          timestamp bigint,
          type text
        );
      `);
      throw ticketsError;
    }

    // Check for seed need in Supabase
    if (!ticketsData || ticketsData.length === 0) {
      console.log("Supabase empty, seeding data...");
      try {
        await seedSupabase();
        // Refetch
        const { data: retryData } = await supabase.from('tickets').select('*');
        const { data: retryRemarks } = await supabase.from('remarks').select('*');
        if (retryData) {
          return retryData.map(t => mapTicketFromDB(t, retryRemarks || [])).sort((a, b) => b.updatedAt - a.updatedAt);
        }
      } catch (seedError) {
        console.warn("Seeding Supabase failed (likely permission or table missing), falling back to local.", seedError);
        throw seedError;
      }
    }

    const { data: remarksData, error: remarksError } = await supabase.from('remarks').select('*');
    if (remarksError) throw remarksError;

    return ticketsData.map(t => mapTicketFromDB(t, remarksData || [])).sort((a, b) => b.updatedAt - a.updatedAt);

  } catch (err) {
    console.error("Storage Error (Switching to Offline Mode):", err);
    isFallbackMode = true;
    const local = getLocalTickets();
    if (local.length === 0) return seedLocalData();
    return local;
  }
};

const seedSupabase = async () => {
  const localData = seedLocalData();
  
  const ticketsPayload = localData.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    customer_name: t.customerName,
    status: t.status,
    created_at: t.createdAt,
    updated_at: t.updatedAt
  }));

  const remarksPayload = localData.flatMap(t => t.remarks.map(r => ({
    id: r.id,
    ticket_id: t.id,
    author: r.author,
    text: r.text,
    timestamp: r.timestamp,
    type: r.type
  })));

  const { error: tError } = await supabase.from('tickets').insert(ticketsPayload);
  if (tError) throw tError;
  
  const { error: rError } = await supabase.from('remarks').insert(remarksPayload);
  if (rError) throw rError;
};

export const saveTicket = async (ticket: Ticket): Promise<void> => {
  if (isFallbackMode) {
    const tickets = getLocalTickets();
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx >= 0) tickets[idx] = ticket;
    else tickets.push(ticket);
    saveLocalTickets(tickets);
    return;
  }

  try {
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
    console.error("Failed to save to Supabase, saving locally instead:", err);
    // If save fails, we should probably toggle fallback mode to prevent future lag
    isFallbackMode = true;
    saveTicket(ticket);
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

  await saveTicket(newTicket);
  return newTicket;
};
import { createClient } from '@supabase/supabase-js';
import { Ticket, TicketStatus, Remark } from "../types";

// Supabase Configuration
const SUPABASE_URL = 'https://ralhkmpbslsdkwnqzqen.supabase.co';
// Note: This key appears to be a Publishable Key format. If connection fails, check if a valid Supabase Anon Key (starts with ey...) is needed.
const SUPABASE_KEY = 'sb_publishable_gMdAKFb5sgN89c7OzhIRdA_nrNGz3pP';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fallback Local Storage Key
const LOCAL_STORAGE_KEY = 'ticketflow_data_v2';
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
  // If we already have local data, return it to preserve state
  const existing = getLocalTickets();
  if (existing.length > 0) return existing;

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
  // 1. Check if forced fallback
  if (isFallbackMode) {
    const local = getLocalTickets();
    return local.length === 0 ? seedLocalData() : local;
  }

  try {
    // 2. Try Supabase
    // We fetch tickets first. If table missing, this throws.
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (ticketsError) {
      // Differentiate between network error and missing table
      // code 42P01 is "relation does not exist" in Postgres
      throw ticketsError; 
    }

    // 3. If empty, seed Supabase
    if (!ticketsData || ticketsData.length === 0) {
      console.log("Supabase empty, attempting to seed data...");
      try {
        await seedSupabase();
        // Refetch after seed
        const { data: retryData } = await supabase.from('tickets').select('*');
        const { data: retryRemarks } = await supabase.from('remarks').select('*');
        
        if (retryData) {
          return retryData.map(t => mapTicketFromDB(t, retryRemarks || [])).sort((a, b) => b.updatedAt - a.updatedAt);
        }
      } catch (seedError) {
        console.warn("Seeding Supabase failed (likely permission issues), reverting to local storage.", seedError);
        throw seedError; // Fallback to local
      }
    }

    // 4. Fetch remarks
    const { data: remarksData, error: remarksError } = await supabase.from('remarks').select('*');
    if (remarksError) throw remarksError;

    // 5. Map and return
    return ticketsData.map(t => mapTicketFromDB(t, remarksData || [])).sort((a, b) => b.updatedAt - a.updatedAt);

  } catch (err: any) {
    // 6. Handle Error & Fallback
    console.group("Supabase Connection Failed");
    console.error("Error details:", err.message || err);
    console.warn("Switching to Offline Mode (Local Storage).");
    console.log("%cTo fix this, run the SQL query in the console below in your Supabase SQL Editor:", "color: #4F46E5; font-weight: bold;");
    console.log(`
      -- Run this in Supabase SQL Editor
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        customer_name TEXT,
        status TEXT NOT NULL,
        created_at BIGINT,
        updated_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS remarks (
        id TEXT PRIMARY KEY,
        ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
        author TEXT,
        text TEXT,
        timestamp BIGINT,
        type TEXT
      );

      ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE remarks ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Public tickets access" ON tickets FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Public remarks access" ON remarks FOR ALL USING (true) WITH CHECK (true);
    `);
    console.groupEnd();

    isFallbackMode = true;
    const local = getLocalTickets();
    return local.length === 0 ? seedLocalData() : local;
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

    // We simple upsert all remarks. For efficiency in prod, we might only insert new ones, 
    // but upsert is safe here.
    const { error: remarksError } = await supabase
      .from('remarks')
      .upsert(remarksPayload);

    if (remarksError) throw remarksError;

  } catch (err) {
    console.error("Failed to save to Supabase, switching to local:", err);
    isFallbackMode = true;
    saveTicket(ticket); // Retry locally
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
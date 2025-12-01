import React, { useState } from 'react';
import { generateTicketSummary } from '../services/geminiService';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, customerName: string) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && description && customerName) {
      onSubmit(title, description, customerName);
      // Reset
      setTitle('');
      setDescription('');
      setCustomerName('');
      onClose();
    }
  };

  const handleAutoTitle = async () => {
    if (!description) return;
    setIsSummarizing(true);
    const summary = await generateTicketSummary(description);
    setTitle(summary);
    setIsSummarizing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in-up">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-lg font-bold">Create New Ticket</h2>
          <button onClick={onClose} className="text-white hover:text-indigo-200 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., Jane Doe"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description</label>
             <textarea
               required
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
               placeholder="Describe the issue in detail..."
             />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Ticket Title</label>
              <button
                type="button"
                onClick={handleAutoTitle}
                disabled={!description || isSummarizing}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                 {isSummarizing ? 'Generating...' : '✨ AI Summarize Title'}
              </button>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Brief summary of the issue"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition"
            >
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

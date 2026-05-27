'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Plus, Pencil, Trash2, AlertTriangle, Package, AlertCircle, Search } from 'lucide-react';
import { formatDate, parseQuantityNumber } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Medicine {
  id: string;
  name: string;
  category: string;
  description?: string;
  quantity: string;
  unit: string;
  price: number;
  expiryDate?: string;
  manufacturer?: string;
  batchNumber?: string;
  minStock: string;
}

export default function AdminMedicinePage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', category: '', description: '', quantity: '',
    unit: 'tablets', price: 0, expiryDate: '', manufacturer: '',
    batchNumber: '', minStock: '10',
  });

  const fetchMedicines = async (query = '') => {
    try {
      const res = await fetch(`/api/admin/medicine?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setMedicines(data.medicines || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const fetchAllMedicines = async () => {
    try {
      const res = await fetch('/api/admin/medicine');
      const data = await res.json();
      setAllMedicines(data.medicines || []);
    } catch {
      // quiet fail
    }
  };

  useEffect(() => {
    const loadMedicines = async () => {
      await fetchMedicines();
      await fetchAllMedicines();
    };
    void loadMedicines();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchMedicines(search);
  };

  const resetForm = () => {
    setFormData({
      name: '', category: '', description: '', quantity: '',
      unit: 'tablets', price: 0, expiryDate: '', manufacturer: '',
      batchNumber: '', minStock: '10',
    });
  };

  const openEdit = (med: Medicine) => {
    setFormData({
      name: med.name, category: med.category, description: med.description || '',
      quantity: med.quantity.toString(), unit: med.unit, price: med.price,
      expiryDate: med.expiryDate ? med.expiryDate.split('T')[0] : '',
      manufacturer: med.manufacturer || '', batchNumber: med.batchNumber || '',
      minStock: med.minStock.toString(),
    });
    setEditingMedicine(med);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = editingMedicine ? `/api/admin/medicine/${editingMedicine.id}` : '/api/admin/medicine';
      const method = editingMedicine ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: String(formData.quantity),
          price: Number(formData.price),
          minStock: String(formData.minStock),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(editingMedicine ? 'Medicine updated' : 'Medicine added');
      setShowModal(false);
      setEditingMedicine(null);
      resetForm();
      fetchMedicines(search);
      void fetchAllMedicines();
    } catch { toast.error('Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this medicine?')) return;
    try {
      await fetch(`/api/admin/medicine/${id}`, { method: 'DELETE' });
      toast.success('Medicine deleted');
      fetchMedicines(search);
      void fetchAllMedicines();
    } catch { toast.error('Failed to delete'); }
  };

  const [showExpiringOnly, setShowExpiringOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('filter') === 'expiring') {
        setShowExpiringOnly(true);
      }
    }
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const expiringSoonMeds = medicines.filter(m => {
    if (!m.expiryDate) return false;
    const expiry = new Date(m.expiryDate);
    return expiry <= thirtyDaysFromNow;
  });

  const lowStockMeds = medicines.filter(m => parseQuantityNumber(m.quantity) <= parseQuantityNumber(m.minStock));
  const categories = [...new Set(medicines.map(m => m.category))];

  const displayedMedicines = medicines.filter(m => {
    // 1. Expiry filter
    const matchesExpiry = showExpiringOnly ? (
      m.expiryDate ? new Date(m.expiryDate) <= thirtyDaysFromNow : false
    ) : true;

    return matchesExpiry;
  });

  // Get unique suggestions by name
  const filteredSuggestions = (() => {
    if (search.trim().length === 0) return [];
    const query = search.toLowerCase();
    const seen = new Set<string>();
    const matches: Medicine[] = [];
    
    for (const med of allMedicines) {
      const matchName = med.name.toLowerCase().includes(query);
      const matchCat = med.category.toLowerCase().includes(query);
      const matchMan = med.manufacturer ? med.manufacturer.toLowerCase().includes(query) : false;
      
      if (matchName || matchCat || matchMan) {
        const uniqueKey = `${med.name.toLowerCase()}-${med.category.toLowerCase()}`;
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          matches.push(med);
        }
      }
    }
    return matches.slice(0, 8);
  })();

  const selectSuggestion = (med: Medicine) => {
    setSearch(med.name);
    setShowSuggestions(false);
    setLoading(true);
    fetchMedicines(med.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          e.preventDefault();
          selectSuggestion(filteredSuggestions[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const renderHighlightedText = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return <span>{text}</span>;
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    return (
      <span className="text-[var(--color-text-secondary)] font-normal">
        {before}
        <span className="font-semibold text-[var(--color-text)]">{match}</span>
        {after}
      </span>
    );
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Medicine Stock</h2>
          <p className="text-[var(--color-text-secondary)]">Manage inventory and track stock levels</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingMedicine(null); setShowModal(true); }}>
          <Plus size={18} /> Add Medicine
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockMeds.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Low Stock Alert</p>
              <p className="text-xs text-amber-700">
                {lowStockMeds.length} medicine(s) are running low: {lowStockMeds.map(m => m.name).join(', ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Expiring Soon Alert */}
      {expiringSoonMeds.length > 0 && (
        <Card className="border-red-300 bg-red-50/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Expiring Soon Alert</p>
                <p className="text-xs text-red-700">
                  {expiringSoonMeds.length} medicine(s) are expiring soon: {expiringSoonMeds.map(m => `${m.name} (${m.expiryDate ? formatDate(m.expiryDate) : ''})`).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExpiringOnly(!showExpiringOnly)}
              className="text-xs font-semibold text-red-700 hover:text-red-900 underline shrink-0"
            >
              {showExpiringOnly ? 'Show All Medicines' : 'Filter Expiring Soon'}
            </button>
          </div>
        </Card>
      )}

      {/* Stock Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--color-text)]">{medicines.length}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Total Items</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Package size={20} className="text-[#2E7D32]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--color-text)]">{categories.length}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Categories</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--color-text)]">{lowStockMeds.length}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Low Stock</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${showExpiringOnly ? 'ring-2 ring-red-500 bg-red-50/20' : 'hover:bg-red-50/10'}`}
          onClick={() => setShowExpiringOnly(!showExpiringOnly)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center relative">
              <AlertCircle size={20} className="text-red-500" />
              {expiringSoonMeds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--color-text)]">{expiringSoonMeds.length}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Expiring Soon</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package size={20} className="text-[#1565C0]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--color-text)]">
                ₹{medicines.reduce((sum, m) => sum + m.price * parseQuantityNumber(m.quantity), 0).toLocaleString()}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">Total Value</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 relative z-30" ref={searchRef}>
        <div className="flex-1 relative">
          <Input
            placeholder="Search by name, category, or manufacturer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => {
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            icon={<Search size={18} />}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl overflow-hidden max-h-[320px] overflow-y-auto backdrop-blur-md bg-white/95">
              {filteredSuggestions.map((med, index) => (
                <div
                  key={med.id}
                  onClick={() => selectSuggestion(med)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                    highlightedIndex === index
                      ? 'bg-[var(--color-bg)]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Search size={16} className="text-[var(--color-text-secondary)] shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {renderHighlightedText(med.name, search)}
                      </span>
                      {med.manufacturer && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {med.manufacturer}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1565C0] shrink-0 border border-blue-100">
                    {med.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-dark)] transition-colors shadow-md shadow-blue-500/10">
          Search
        </button>
      </form>


      {/* Medicines Table */}
      {displayedMedicines.length === 0 ? (
        <Card className="text-center py-12">
          <Package size={48} className="mx-auto text-[var(--color-text-secondary)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            {showExpiringOnly ? 'No medicines are about to expire' : 'No medicines in stock'}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[var(--color-bg)] border border-[var(--color-border)] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase rounded-tl-xl">Medicine</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Stock</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Price</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Expiry</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedMedicines.map((med) => (
                <tr key={med.id} className="bg-[var(--color-surface)] border-x border-b border-[var(--color-border)]">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-[var(--color-text)]">{med.name}</p>
                    {med.manufacturer && <p className="text-xs text-[var(--color-text-secondary)]">{med.manufacturer}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-[#1565C0]">
                      {med.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text)]">{med.quantity} {med.unit}</td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text)]">₹{med.price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">
                    {med.expiryDate ? (
                      <span className={new Date(med.expiryDate) <= thirtyDaysFromNow ? 'text-red-600 font-semibold flex items-center gap-1.5' : ''}>
                        {new Date(med.expiryDate) <= thirtyDaysFromNow && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                        )}
                        {formatDate(med.expiryDate)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      parseQuantityNumber(med.quantity) <= parseQuantityNumber(med.minStock)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {parseQuantityNumber(med.quantity) <= parseQuantityNumber(med.minStock) ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(med)} className="p-1.5 rounded-lg hover:bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(med.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingMedicine(null); resetForm(); }}
        title={editingMedicine ? 'Edit Medicine' : 'Add Medicine'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Name *" placeholder="Amoxicillin" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Category *" placeholder="Antibiotics" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Quantity *" type="text" placeholder="e.g., 4^5 or 4*100" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--color-text)]">Unit *</label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)]"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                {['tablets', 'capsules', 'units', 'mg', 'bottles', 'vials', 'tubes', 'packets', 'injection'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <Input label="Price (₹) *" type="number" step="0.01" min="0" value={formData.price.toString()} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} required />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Min Stock" type="text" placeholder="e.g., 10" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} />
            <Input label="Expiry Date" type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
            <Input label="Batch Number" placeholder="BN-001" value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} />
          </div>
          <Input label="Manufacturer" placeholder="PharmaCo" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text)]">Description</label>
            <textarea rows={2} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] resize-none"
              placeholder="Medicine description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setEditingMedicine(null); resetForm(); }} className="flex-1">Cancel</Button>
            <Button type="submit" loading={formLoading} className="flex-1">{editingMedicine ? 'Update' : 'Add Medicine'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

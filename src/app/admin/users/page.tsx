'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Search, Users, Pencil, X, Save } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  isActive: boolean;
  createdAt: string;
  _count: { pets: number; appointments: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Edit form state
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isActive: true,
  });

  const fetchUsers = async (query = '', page = 1) => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&page=${page}`);
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const loadUsers = async () => {
      await fetchUsers();
    };
    void loadUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchUsers(search);
  };

  const openEditModal = (u: UserData) => {
    setEditingUser(u);
    setUserForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email || '',
      phone: u.phone,
      isActive: u.isActive,
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers(search, pagination.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Manage Users</h2>
        <p className="text-[var(--color-text-secondary)]">View and manage registered users ({pagination.total} total)</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
          />
        </div>
        <button type="submit" className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-dark)] transition-colors">
          Search
        </button>
      </form>

      {/* Users Table */}
      {users.length === 0 ? (
        <Card className="text-center py-12">
          <Users size={48} className="mx-auto text-[var(--color-text-secondary)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">No users found</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[var(--color-bg)] border border-[var(--color-border)] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase rounded-tl-xl">User</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Phone</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Pets</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Appointments</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Joined</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="bg-[var(--color-surface)] border-x border-b border-[var(--color-border)] last:rounded-b-xl">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xs">
                        {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[var(--color-text)]">{u.firstName} {u.lastName}</span>
                        {u.email && <span className="text-xs text-[var(--color-text-secondary)]">{u.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">{u.phone}</td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text)]">{u._count.pets}</td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text)]">{u._count.appointments}</td>
                  <td className="px-4 py-4 text-sm text-[var(--color-text-secondary)]">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-2 rounded-lg hover:bg-[var(--color-border)]/50 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                      title="Edit User"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => { setLoading(true); fetchUsers(search, page); }}
              className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                page === pagination.page
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingUser(null); }}
        title="Edit User Details"
        size="lg"
      >
        <form onSubmit={handleUpdateUser} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={userForm.firstName}
              onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name *"
              value={userForm.lastName}
              onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="e.g., user@example.com"
            />
            <Input
              label="Phone Number *"
              value={userForm.phone}
              onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text)]">Status *</label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)] transition-all"
              value={userForm.isActive ? 'true' : 'false'}
              onChange={(e) => setUserForm({ ...userForm, isActive: e.target.value === 'true' })}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => { setShowEditModal(false); setEditingUser(null); }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              <Save size={18} /> Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


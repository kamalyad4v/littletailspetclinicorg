'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Users, Dog, Calendar, Clock, CheckCircle, TrendingUp, ArrowRight, Phone, CalendarCheck, Syringe, AlertCircle, Search } from 'lucide-react';
import { formatDate, formatTime, getStatusColor, getServiceLabel } from '@/lib/utils';

interface TodayAppointment {
  id: string;
  date: string;
  time: string;
  serviceType: string;
  status: string;
  reason?: string;
  adminNotes?: string;
  pet: { name: string; species: string; breed: string };
  user: { firstName: string; lastName: string; phone: string };
}

interface VaccinationReminder {
  id: string;
  vaccineName: string;
  dateAdministered: string;
  nextDueDate: string;
  pet: {
    id: string;
    registrationNo: string;
    name: string;
    species: string;
    breed: string;
    owner: { firstName: string; lastName: string; phone: string };
  };
}

interface DashboardData {
  stats: {
    totalUsers: number;
    totalPets: number;
    totalAppointments: number;
    pendingAppointments: number;
    approvedAppointments: number;
    completedAppointments: number;
    lowStockMedicines: number;
    expiringMedicinesCount: number;
  };
  recentAppointments: Array<{
    id: string;
    date: string;
    time: string;
    serviceType: string;
    status: string;
    pet: { name: string; species: string };
    user: { firstName: string; lastName: string };
  }>;
  recentUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    createdAt: string;
    _count: { pets: number };
  }>;
  todaysAppointments: TodayAppointment[];
  upcomingVaccinationReminders: VaccinationReminder[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllReminders, setShowAllReminders] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();

    // Update current time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const stats = data?.stats || {
    totalUsers: 0, totalPets: 0, totalAppointments: 0,
    pendingAppointments: 0, approvedAppointments: 0, completedAppointments: 0, lowStockMedicines: 0,
    expiringMedicinesCount: 0,
  };

  const todaysAppointments = data?.todaysAppointments || [];
  const todayPending = todaysAppointments.filter(a => a.status === 'PENDING').length;
  const todayApproved = todaysAppointments.filter(a => a.status === 'APPROVED').length;
  const todayCompleted = todaysAppointments.filter(a => a.status === 'COMPLETED').length;

  // Vaccination reminders
  const vaccinationReminders = data?.upcomingVaccinationReminders || [];
  const filteredReminders = vaccinationReminders.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const petName = v.pet.name.toLowerCase();
    const regNo = v.pet.registrationNo ? v.pet.registrationNo.toLowerCase() : '';
    const ownerName = `${v.pet.owner.firstName} ${v.pet.owner.lastName}`.toLowerCase();
    const phone = v.pet.owner.phone ? v.pet.owner.phone.toLowerCase() : '';
    const vaccine = v.vaccineName.toLowerCase();
    return petName.includes(query) || regNo.includes(query) || ownerName.includes(query) || phone.includes(query) || vaccine.includes(query);
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueCount = vaccinationReminders.filter(v => new Date(v.nextDueDate) < today).length;
  const dueSoonCount = vaccinationReminders.filter(v => {
    const d = new Date(v.nextDueDate);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;

  const todayFormatted = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const petEmoji = (species: string) => {
    const emojis: Record<string, string> = {
      dog: '🐕', cat: '🐈', bird: '🐦', rabbit: '🐰', fish: '🐠', hamster: '🐹',
    };
    return emojis[species.toLowerCase()] || '🐾';
  };

  const serviceIcon = (service: string) => {
    const icons: Record<string, string> = {
      VACCINATION: '💉',
      GROOMING: '✂️',
      PET_FOOD_NUTRITION: '🍖',
      MEDICINE: '💊',
      GENERAL_CHECKUP: '🩺',
      PET_ACCESSORIES: '🛍️',
      PET_FOR_SALE: '🏷️',
      PET_CARE: '❤️',
    };
    return icons[service] || '📋';
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, bg: 'bg-blue-50 border border-blue-100', iconColor: 'text-[#1565C0]', href: '/admin/users' },
    { label: 'Registered Pets', value: stats.totalPets, icon: <Dog size={24} />, bg: 'bg-green-50 border border-green-100', iconColor: 'text-[#2E7D32]', href: '/admin/pets' },
    { label: 'Total Appointments', value: stats.totalAppointments, icon: <Calendar size={24} />, bg: 'bg-blue-50 border border-blue-100', iconColor: 'text-[#1565C0]', href: '/admin/appointments' },
    { label: 'Pending Review', value: stats.pendingAppointments, icon: <Clock size={24} />, bg: 'bg-amber-50 border border-amber-100', iconColor: 'text-amber-600', href: '/admin/appointments' },
    { label: 'Approved', value: stats.approvedAppointments, icon: <CheckCircle size={24} />, bg: 'bg-green-50 border border-green-100', iconColor: 'text-[#2E7D32]', href: '/admin/appointments' },
    { label: 'About to Expire', value: stats.expiringMedicinesCount || 0, icon: <AlertCircle size={24} />, bg: (stats.expiringMedicinesCount || 0) > 0 ? 'bg-red-50 border border-red-100 relative' : 'bg-blue-50 border border-blue-100', iconColor: (stats.expiringMedicinesCount || 0) > 0 ? 'text-red-600' : 'text-[#1565C0]', href: '/admin/medicine?filter=expiring' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#1A2332]">Admin Dashboard</h2>
        <p className="text-[#5F6B7A]">Overview of clinic operations and management</p>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TODAY'S SCHEDULE — Primary Feature Section */}
      {/* ═══════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#1565C0] to-[#42A5F5] rounded-2xl p-6 lg:p-8 shadow-xl shadow-blue-500/15 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <CalendarCheck size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Today&apos;s Schedule</h3>
                <p className="text-white/80 text-sm">{todayFormatted}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">{todaysAppointments.length}</p>
                <p className="text-xs text-white/80">Total</p>
              </div>
              <div className="bg-amber-400/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center border border-amber-300/30">
                <p className="text-2xl font-bold">{todayPending}</p>
                <p className="text-xs text-white/80">Pending</p>
              </div>
              <div className="bg-green-400/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center border border-green-300/30">
                <p className="text-2xl font-bold">{todayApproved}</p>
                <p className="text-xs text-white/80">Approved</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">{todayCompleted}</p>
                <p className="text-xs text-white/80">Done</p>
              </div>
            </div>
          </div>

          {/* Today's Appointments List */}
          {todaysAppointments.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-lg font-semibold">No Appointments Today</p>
              <p className="text-white/70 text-sm mt-1">Enjoy your free day, Dr. Ganesh! 😊</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-200 ${
                    apt.status === 'COMPLETED' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Time Badge */}
                    <div className="flex items-center gap-3 sm:w-24 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold">
                        {formatTime(apt.time)}
                      </div>
                    </div>

                    {/* Service & Pet Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">{petEmoji(apt.pet.species)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">
                            {apt.pet.name}
                            <span className="font-normal text-white/70"> — {apt.pet.breed}</span>
                          </p>
                        </div>
                        <p className="text-xs text-white/70 truncate">
                          {serviceIcon(apt.serviceType)} {getServiceLabel(apt.serviceType)}
                          {apt.reason && ` • ${apt.reason}`}
                        </p>
                      </div>
                    </div>

                    {/* Owner Info */}
                    <div className="flex items-center gap-3 sm:w-auto">
                      <div className="text-right">
                        <p className="text-sm font-medium">{apt.user.firstName} {apt.user.lastName}</p>
                        {apt.user.phone && (
                          <a href={`tel:${apt.user.phone}`} className="text-xs text-white/70 hover:text-white flex items-center gap-1 justify-end">
                            <Phone size={10} />
                            {apt.user.phone}
                          </a>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                        apt.status === 'APPROVED' ? 'bg-green-400/30 text-green-100 border border-green-300/30' :
                        apt.status === 'PENDING' ? 'bg-amber-400/30 text-amber-100 border border-amber-300/30' :
                        apt.status === 'COMPLETED' ? 'bg-white/20 text-white/80' :
                        apt.status === 'CANCELLED' ? 'bg-red-400/30 text-red-100 border border-red-300/30' :
                        'bg-white/20 text-white/80'
                      }`}>
                        {apt.status === 'APPROVED' ? '✅' : apt.status === 'PENDING' ? '⏳' : apt.status === 'COMPLETED' ? '✔️' : '❌'} {apt.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Link */}
          {todaysAppointments.length > 0 && (
            <div className="mt-4 text-center">
              <Link href="/admin/appointments" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors">
                Manage all appointments <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card hover className="relative overflow-hidden shadow-sm">
              {stat.label === 'About to Expire' && stat.value > 0 && (
                <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white" />
              )}
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <span className={stat.iconColor}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-[#1A2332]">{stat.value}</p>
              <p className="text-sm text-[#5F6B7A]">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* VACCINATION DUE REMINDERS */}
      {/* ═══════════════════════════════════════════ */}
      {vaccinationReminders.length > 0 && (
        <Card className="shadow-sm border-l-4 border-l-amber-400 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-60"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Syringe size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1A2332]">Vaccination Due Reminders</h3>
                  <p className="text-xs text-[#5F6B7A]">{vaccinationReminders.length} upcoming vaccination{vaccinationReminders.length !== 1 ? 's' : ''} due</p>
                </div>
              </div>
              <div className="flex gap-2">
                {overdueCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1 border border-red-200">
                    <AlertCircle size={12} /> {overdueCount} Overdue
                  </span>
                )}
                {dueSoonCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                    {dueSoonCount} Due Soon
                  </span>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#5F6B7A]/50">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by pet name, registration no. or owner's phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#DDE3EC] bg-white text-[#1A2332] placeholder:text-[#5F6B7A]/50 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-3">
              {filteredReminders.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#5F6B7A] bg-[#F5F7FA] border border-[#DDE3EC] rounded-xl">
                  No matching reminders found
                </div>
              ) : (
                (showAllReminders ? filteredReminders : filteredReminders.slice(0, 5)).map((vax) => {
                  const dueDate = new Date(vax.nextDueDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = diffDays < 0;
                  const isDueSoon = diffDays >= 0 && diffDays <= 30;

                  return (
                    <div
                      key={vax.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
                        isOverdue
                          ? 'bg-red-50 border-red-200 hover:border-red-300'
                          : isDueSoon
                          ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                          : 'bg-[#F5F7FA] border-[#DDE3EC] hover:border-blue-200'
                      }`}
                    >
                      {/* Pet Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          isOverdue ? 'bg-red-100' : isDueSoon ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          {petEmoji(vax.pet.species)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-[#1A2332]">
                              {vax.pet.name}
                            </p>
                            {vax.pet.registrationNo && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                {vax.pet.registrationNo}
                              </span>
                            )}
                            <span className="text-xs text-[#5F6B7A]">{vax.pet.breed}</span>
                          </div>
                          <p className="text-xs text-[#5F6B7A]">
                            💉 {vax.vaccineName} • Last: {formatDate(vax.dateAdministered)}
                          </p>
                        </div>
                      </div>

                      {/* Owner */}
                      <div className="flex items-center gap-3 sm:w-auto">
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#1A2332]">
                            {vax.pet.owner.firstName} {vax.pet.owner.lastName}
                          </p>
                          {vax.pet.owner.phone && (
                            <a href={`tel:${vax.pet.owner.phone}`} className="text-xs text-[#5F6B7A] hover:text-[#1565C0] flex items-center gap-1 justify-end">
                              <Phone size={10} />
                              {vax.pet.owner.phone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Due Date Badge */}
                      <div className="sm:w-auto">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                          isOverdue
                            ? 'bg-red-600 text-white shadow-sm shadow-red-500/30'
                            : isDueSoon
                            ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {isOverdue ? (
                            <><AlertCircle size={12} /> {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? 's' : ''} overdue</>
                          ) : diffDays === 0 ? (
                            <><AlertCircle size={12} /> Due Today</>
                          ) : (
                            <><Calendar size={12} /> Due: {formatDate(vax.nextDueDate)}</>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* View All Option */}
            {filteredReminders.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllReminders(!showAllReminders)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {showAllReminders ? 'Show Less' : `View All (${filteredReminders.length - 5} more)`}
                  <ArrowRight size={12} className={`transition-transform duration-200 ${showAllReminders ? '-rotate-90' : 'rotate-90'}`} />
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <Card className="shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#1A2332]">Recent Appointments</h3>
            <Link href="/admin/appointments" className="text-sm text-[#1565C0] hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {data?.recentAppointments && data.recentAppointments.length > 0 ? (
            <div className="space-y-3">
              {data.recentAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F7FA] border border-[#DDE3EC]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1A2332] truncate">
                        {apt.user.firstName} {apt.user.lastName}
                      </p>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#5F6B7A]">
                      {apt.pet.name} • {getServiceLabel(apt.serviceType)} • {formatDate(apt.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5F6B7A] text-center py-8">No appointments yet</p>
          )}
        </Card>

        {/* Recent Users */}
        <Card className="shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#1A2332]">New Users</h3>
            <Link href="/admin/users" className="text-sm text-[#1565C0] hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {data?.recentUsers && data.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F7FA] border border-[#DDE3EC]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1565C0] to-[#42A5F5] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A2332] truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-[#5F6B7A]">
                      {u.phone} • {u._count.pets} pets
                    </p>
                  </div>
                  <span className="text-xs text-[#5F6B7A]">{formatDate(u.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5F6B7A] text-center py-8">No users yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}

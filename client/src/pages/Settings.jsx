import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import api from '../api/client';
import {
  User,
  Lock,
  Phone,
  Mail,
  Shield,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';

export function Settings() {
  const { user, setUser } = useAuthStore();
  const { showNotification } = useUiStore();

  // Profile Form
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      const res = await api.put('/auth/profile', profileData);
      setUser(res.data.data);
      showNotification('Profile updated successfully');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('New password and confirmation do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showNotification('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      showNotification('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Security Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal workforce profile, contact information, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center">
            <div className="w-20 h-20 rounded-full bg-brand-500/20 text-brand-600 border-2 border-brand-500/40 mx-auto flex items-center justify-center font-black text-2xl uppercase shadow-inner">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-3">{user?.name}</h2>
            <p className="text-xs text-slate-400">{user?.email}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-brand-600" />
              <span className="text-xs font-semibold text-slate-700 capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-300 p-5 rounded-3xl space-y-2 text-xs">
            <h4 className="text-white font-bold text-sm">Security Best Practices</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Use at least 8 alphanumeric characters</li>
              <li>Ensure your WhatsApp phone is up to date to receive salary slips</li>
              <li>Never share your credentials with unauthorized site contractors</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Profile Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address (Read-only)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (for WhatsApp Alerts & Payslips)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter with country code or 10-digit mobile to receive 1-click WhatsApp monthly payroll notifications.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50 transition-all"
                >
                  {isUpdatingProfile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound className="w-5 h-5 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all"
                >
                  {isUpdatingPassword ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;

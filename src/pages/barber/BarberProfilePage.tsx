import { authApi } from '../../api/auth.api';
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { User, Phone, Mail, Lock, Upload, X, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const BarberProfilePage: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(
    profile && 'fullName' in profile ? profile.fullName : ''
  );
  const [phone, setPhone] = useState(
    profile && 'phone' in profile ? profile.phone : ''
  );
  const [profileImagePreview, setProfileImagePreview] = useState<string>(
    profile && 'profileImage' in profile ? profile.profileImage || '' : ''
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setProfileError('Station badge image must be smaller than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
        setProfileError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (!fullName.trim() || !phone.trim()) {
      setProfileError('Full name and contact phone number cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    try {
      
      await authApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        profileImage: profileImagePreview || undefined,
      });
      await refreshUser();
      setIsSavingProfile(false);
      setProfileSuccess('Barber workstation details updated.');
    } catch (err: any) {
      setIsSavingProfile(false);
      setProfileError(err.message || 'Failed to update profile.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      
      await authApi.changePassword(currentPassword, newPassword);
      setIsUpdatingPassword(false);
      setPasswordSuccess('Security credentials updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setIsUpdatingPassword(false);
      setPasswordError(err.message || 'Failed to update security credentials.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <User className="w-7 h-7 text-amber-500" />
          <span>Barber Profile & Station Settings</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Maintain your chair profile, contact number, and login credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-neutral-800 bg-neutral-900/90 space-y-6">
          <h2 className="text-base font-semibold text-neutral-100 border-b border-neutral-800 pb-3">
            Station Profile
          </h2>

          {profileSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4 pb-2">
              <div className="relative w-20 h-20 rounded-full border border-neutral-700 bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="Barber Station Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-neutral-500" />
                )}
                {profileImagePreview && (
                  <button
                    type="button"
                    onClick={() => setProfileImagePreview('')}
                    className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{profileImagePreview ? 'Change Avatar' : 'Upload Avatar'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="text-[11px] text-neutral-500">Max size 2MB</p>
              </div>
            </div>

            <Input
              label="Barber Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              required
            />

            <Input
              label="Account Email"
              value={user?.email || 'barber@barbershop.com'}
              disabled
              helperText="Barber account email is managed by the shop administrator."
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingProfile}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/90 space-y-6">
          <h2 className="text-base font-semibold text-neutral-100 border-b border-neutral-800 pb-3">
            Change Password
          </h2>

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <Input
              label="Current Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Input
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-neutral-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={isUpdatingPassword}
              >
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

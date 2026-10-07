import { authApi } from '../../api/auth.api';
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { User, Phone, Mail, Lock, Upload, X, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const CustomerProfilePage: React.FC = () => {
  const { user, profile, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(
    profile && 'fullName' in profile ? profile.fullName : ''
  );
  const [phone, setPhone] = useState(
    profile && 'phone' in profile ? profile.phone : ''
  );
  const [email] = useState(user?.email || '');
  const [profileImagePreview, setProfileImagePreview] = useState<string>(
    profile && 'profileImage' in profile ? profile.profileImage || '' : ''
  );

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status flags
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
        setProfileError('Image size must be smaller than 2MB.');
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
      setProfileError('Full name and phone number cannot be empty.');
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
      setProfileSuccess('Profile details saved successfully.');
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
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setIsUpdatingPassword(false);
      setPasswordError(err.message || 'Failed to update password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <User className="w-7 h-7 text-amber-500" />
          <span>My Profile</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage your personal details, contact preferences, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Avatar */}
        <Card className="lg:col-span-2 border-neutral-800 bg-neutral-900/90 space-y-6">
          <h2 className="text-base font-semibold text-neutral-100 border-b border-neutral-800 pb-3">
            Personal Information
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
                    alt="Customer Avatar"
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
                  <span>{profileImagePreview ? 'Change Photo' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="text-[11px] text-neutral-500">Max file size: 2MB (JPG, PNG)</p>
              </div>
            </div>

            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              required
            />

            <Input
              label="Email Address"
              value={email}
              disabled
              helperText="Email address is tied to your account login and cannot be altered here."
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingProfile}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Password Security Card */}
        <Card className="border-neutral-800 bg-neutral-900/90 space-y-6">
          <h2 className="text-base font-semibold text-neutral-100 border-b border-neutral-800 pb-3">
            Security & Password
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

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import VerificationCodeInput from '../auth/VerificationCodeInput';
import { users } from '../../lib/api';
import { useToast } from '../ui/Toast';

export default function PasswordSection() {
  const [step, setStep] = useState('form'); // form, verify
  const [loading, setLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const toast = useToast();

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateForm = () => {
    if (!oldPassword) {
      setError('Please enter your current password');
      return false;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (oldPassword === newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      await users.requestPasswordChange(oldPassword, newPassword);
      setStep('verify');
      startCountdown();
      toast.success('Verification code sent to your email');
    } catch (error) {
      setError(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError('');
    try {
      await users.requestPasswordChange(oldPassword, newPassword);
      startCountdown();
      toast.success('Verification code resent');
    } catch (error) {
      setError(error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeComplete = (completedCode) => {
    setCode(completedCode);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await users.changePassword(code);
      toast.success('Password changed successfully');
      // Reset form
      resetForm();
    } catch (error) {
      setError(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setCode('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Change Password
      </h2>

      {step === 'form' && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Enter your current password and choose a new password. We'll send a verification code to your email to confirm the change.
          </p>

          <Input
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value);
              setError('');
            }}
            placeholder="Enter your current password"
            disabled={loading}
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError('');
            }}
            placeholder="Enter new password (min 6 characters)"
            disabled={loading}
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            placeholder="Confirm new password"
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !oldPassword || !newPassword || !confirmPassword}
          >
            {loading ? 'Sending code...' : 'Continue'}
          </Button>
        </form>
      )}

      {step === 'verify' && (
        <div className="space-y-6">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              We've sent a 6-digit verification code to your email. Enter it below to confirm your password change.
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Verification Code
              </label>
              <VerificationCodeInput
                onComplete={handleCodeComplete}
                disabled={loading}
                error={error && error.includes('code') ? error : null}
              />
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                  className={`text-sm ${
                    countdown > 0
                      ? 'text-neutral-400 dark:text-neutral-500'
                      : 'text-neutral-900 dark:text-neutral-100 hover:underline'
                  }`}
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </div>

            {error && !error.includes('code') && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading || !code || code.length !== 6}
              >
                {loading ? 'Verifying...' : 'Change Password'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

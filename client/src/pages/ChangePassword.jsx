import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../lib/api';

export function ChangePassword() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const strengthBars = [hasMinLength, hasUppercase, hasNumber].filter(Boolean).length;
  const strengthLabel = strengthBars === 3 ? 'Strong' : strengthBars === 2 ? 'Medium' : strengthBars === 1 ? 'Weak' : '';
  const strengthColor = strengthBars === 3 ? 'text-green-400' : strengthBars === 2 ? 'text-amber-400' : 'text-red-400';

  const canSubmit = password.length >= 6 && passwordsMatch && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setSubmitting(true);
    try {
      const result = await authApi.forcePasswordChange(password);
      updateUser({ must_change_password: false });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber-500/20 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Change Your Password</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Your admin set a temporary password. Please create a new one to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Enter new password"
              autoFocus
            />
            {password && (
              <>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strengthBars
                          ? strengthBars === 3 ? 'bg-green-500' : strengthBars === 2 ? 'bg-amber-500' : 'bg-red-500'
                          : 'bg-[var(--border-default)]'
                      }`}
                    />
                  ))}
                </div>
                {strengthLabel && <p className={`text-xs mt-1 ${strengthColor}`}>{strengthLabel} password</p>}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Confirm new password"
            />
            {confirmPassword && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                {passwordsMatch ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Passwords match
                  </>
                ) : 'Passwords do not match'}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
            <CheckItem checked={hasMinLength}>At least 8 characters</CheckItem>
            <CheckItem checked={hasUppercase}>Contains uppercase letter</CheckItem>
            <CheckItem checked={hasNumber}>Contains number</CheckItem>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? 'Setting password...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CheckItem({ checked, children }) {
  return (
    <p className="flex items-center gap-1.5">
      {checked ? (
        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {children}
    </p>
  );
}

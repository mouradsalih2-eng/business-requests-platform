import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { RequestForm } from '../components/requests/RequestForm';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { requests as requestsApi } from '../lib/api';

export function NewRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');

    try {
      await requestsApi.create(formData);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to create request');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-12">
          <Card>
            <CardBody className="text-center py-12">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Request Submitted</h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-8">
                Your request has been successfully submitted. You can track its status from the tracking page.
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/my-requests">
                  <Button variant="primary" className="w-full">
                    Track My Requests
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="secondary" className="w-full">
                    Browse All Requests
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          {/* Back button - mobile friendly */}
          <button
            onClick={() => navigate(-1)}
            className="sm:hidden flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mb-3 -ml-1 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">New Request</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Submit a new business request</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <RequestForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </Layout>
  );
}

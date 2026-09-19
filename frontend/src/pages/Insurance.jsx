import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

export default function Insurance() {
  const { user } = useAuth();
  const canManage = ['admin', 'receptionist'].includes(user?.role);

  const [providers, setProviders] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [claims, setClaims] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Policy Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [policyForm, setPolicyForm] = useState({
    patient_id: '',
    insurance_provider_id: '',
    policy_number: '',
    tier: 'Gold Comprehensive',
    co_pay_percentage: 10,
    valid_until: '',
    is_primary: true,
  });

  // File Claim Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [activeBill, setActiveBill] = useState(null);
  const [preAuthCode, setPreAuthCode] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [provRes, billRes, claimsRes, ptRes] = await Promise.all([
        client.get('/insurance/providers'),
        client.get('/insurance/pending-bills'),
        client.get('/insurance/claims', { params: { page, status: claimStatusFilter } }),
        client.get('/patients', { params: { per_page: 100 } }),
      ]);
      setProviders(provRes.data.providers || []);
      setPendingBills(billRes.data.bills || []);
      setClaims(claimsRes.data.data || []);
      setLastPage(claimsRes.data.last_page || 1);
      setPatients(ptRes.data.data || []);
    } catch (err) {
      console.error('Failed to load insurance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, claimStatusFilter]);

  const handleEnrollPolicy = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await client.post('/insurance/policies', policyForm);
      setMessage(data.message);
      setShowPolicyModal(false);
      setPolicyForm({
        patient_id: '',
        insurance_provider_id: '',
        policy_number: '',
        tier: 'Gold Comprehensive',
        co_pay_percentage: 10,
        valid_until: '',
        is_primary: true,
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll policy.');
    }
  };

  const openClaimModal = (bill) => {
    setActiveBill(bill);
    setPreAuthCode('');
    setShowClaimModal(true);
  };

  const handleFileClaim = async (e) => {
    e.preventDefault();
    if (!activeBill) return;
    setError('');
    setMessage('');
    try {
      const payload = {
        bill_id: activeBill.id,
        pre_authorization_code: preAuthCode,
      };
      const { data } = await client.post('/insurance/claims', payload);
      setMessage(data.message);
      setShowClaimModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to file claim.');
    }
  };

  const downloadBillInvoice = (billId) => {
    window.open(`/documents/hospital-invoice/${billId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h2>HMO Health Insurance & Split Billing Claims</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Managed healthcare organizations, policy enrollments, and split co-pay claim settlements.
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setError(''); setShowPolicyModal(true); }}>
            <Plus size={16} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Enroll Patient HMO
          </button>
        )}
      </div>

      {message && (
        <div className="card" style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary)', color: 'var(--primary-dark)', padding: '0.85rem' }}>
          {message}
        </div>
      )}

      {error && (
        <div className="card" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* HMO Provider Badges */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Partnered HMO Networks & Pre-Authorization Portals
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {providers.map((prov) => (
            <div
              key={prov.id}
              style={{
                padding: '0.85rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--surface-soft)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{prov.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                Code: {prov.code} · Portal: {prov.provider_portal_url ? 'Direct EDI' : 'Manual'}
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                Claims desk: {prov.claims_phone || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Bills Eligible for Claim Filing */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Unclaimed Invoices Pending HMO Filing ({pendingBills.length})
        </h3>
        {pendingBills.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            No pending bills awaiting claim filing at this time.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.65rem' }}>Bill #</th>
                  <th style={{ padding: '0.65rem' }}>Patient</th>
                  <th style={{ padding: '0.65rem' }}>HMO Provider</th>
                  <th style={{ padding: '0.65rem' }}>Total Amount</th>
                  <th style={{ padding: '0.65rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingBills.map((b) => {
                  const policy = b.patient?.primary_insurance;
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.65rem', fontWeight: 700 }}>
                        {b.bill_number || `BILL-${b.id}`}
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {b.patient?.name}
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{b.patient?.code}</div>
                      </td>
                      <td style={{ padding: '0.65rem' }}>
                        {policy ? (
                          <div>
                            <span style={{ fontWeight: 600 }}>{policy.provider?.name}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              Policy: {policy.policy_number} (Co-pay: {policy.co_pay_percentage}%)
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                            Self-Pay / No HMO
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem', fontWeight: 700 }}>
                        ₦{Number(b.total).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.65rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => downloadBillInvoice(b.id)}
                            className="btn btn-sm btn-secondary"
                            title="Download PDF Bill"
                          >
                            <Download size={13} />
                          </button>
                          {canManage && policy && (
                            <button
                              onClick={() => openClaimModal(b)}
                              className="btn btn-sm btn-primary"
                            >
                              File HMO Claim
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submitted Claims Log */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Claims History & Settlement Queue</h3>
          <select
            value={claimStatusFilter}
            onChange={(e) => { setClaimStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          >
            <option value="all">All Claim Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="settled">Settled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-soft)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem' }}>Claim ID / Pre-Auth</th>
                <th style={{ padding: '0.75rem' }}>Patient</th>
                <th style={{ padding: '0.75rem' }}>HMO Insurer</th>
                <th style={{ padding: '0.75rem' }}>Total Bill</th>
                <th style={{ padding: '0.75rem' }}>Patient Co-Pay</th>
                <th style={{ padding: '0.75rem' }}>HMO Claim</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    Loading claims ledger...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    No HMO claims found in log.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                      #{claim.id}
                      <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--muted)' }}>
                        Auth: {claim.pre_authorization_code || 'Direct'}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {claim.bill?.patient?.name}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {claim.insurance_policy?.provider?.name}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                      ₦{Number(claim.total_bill_amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                      ₦{Number(claim.patient_copay_amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                      ₦{Number(claim.insurance_claim_amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${claim.claim_status === 'settled' ? 'badge-success' : claim.claim_status === 'approved' ? 'badge-info' : 'badge-warning'}`}>
                        {claim.claim_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} lastPage={lastPage} onChange={setPage} />
      </div>

      {/* Modal: Enroll Patient HMO Policy */}
      {showPolicyModal && (
        <Modal title="Enroll Patient HMO Health Insurance Policy" onClose={() => setShowPolicyModal(false)}>
          <form onSubmit={handleEnrollPolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Select Patient *
              </label>
              <select
                required
                value={policyForm.patient_id}
                onChange={(e) => setPolicyForm({ ...policyForm, patient_id: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  HMO Insurer *
                </label>
                <select
                  required
                  value={policyForm.insurance_provider_id}
                  onChange={(e) => setPolicyForm({ ...policyForm, insurance_provider_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                >
                  <option value="">-- Choose Provider --</option>
                  {providers.map((prov) => (
                    <option key={prov.id} value={prov.id}>{prov.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Policy / Enrollee Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="AXA-998822"
                  value={policyForm.policy_number}
                  onChange={(e) => setPolicyForm({ ...policyForm, policy_number: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Coverage Plan / Tier
                </label>
                <input
                  type="text"
                  placeholder="Gold Comprehensive"
                  value={policyForm.tier}
                  onChange={(e) => setPolicyForm({ ...policyForm, tier: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Patient Co-Payment (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  placeholder="10"
                  value={policyForm.co_pay_percentage}
                  onChange={(e) => setPolicyForm({ ...policyForm, co_pay_percentage: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowPolicyModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Enroll Policy
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: File HMO Claim */}
      {showClaimModal && activeBill && (
        <Modal title={`File HMO Claim · Bill #${activeBill.bill_number || activeBill.id}`} onClose={() => setShowClaimModal(false)}>
          <form onSubmit={handleFileClaim} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <div><strong>Patient:</strong> {activeBill.patient?.name} ({activeBill.patient?.code})</div>
              <div><strong>HMO Provider:</strong> {activeBill.patient?.primary_insurance?.provider?.name}</div>
              <div><strong>Policy Number:</strong> {activeBill.patient?.primary_insurance?.policy_number}</div>
            </div>

            {/* Split Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Total Invoice</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>₦{Number(activeBill.total).toLocaleString()}</div>
              </div>

              <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Patient Co-Pay ({activeBill.patient?.primary_insurance?.co_pay_percentage}%)
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--warning)' }}>
                  ₦{Number((activeBill.total * (activeBill.patient?.primary_insurance?.co_pay_percentage || 0)) / 100).toLocaleString()}
                </div>
              </div>

              <div style={{ padding: '0.75rem', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', background: 'var(--primary-soft)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', fontWeight: 600 }}>HMO Claim Amount</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                  ₦{Number(activeBill.total - (activeBill.total * (activeBill.patient?.primary_insurance?.co_pay_percentage || 0)) / 100).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Pre-Authorization Approval Code (if acquired from HMO desk)
              </label>
              <input
                type="text"
                placeholder="e.g. AUTH-2026-9921-HYG"
                value={preAuthCode}
                onChange={(e) => setPreAuthCode(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowClaimModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Claim to HMO
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

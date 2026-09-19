import { useEffect, useState } from 'react';
import { Activity, Plus, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

export default function Laboratory() {
  const { user } = useAuth();
  const canOrder = ['admin', 'doctor'].includes(user?.role);

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Available test catalog & patients/doctors
  const [testCatalog, setTestCatalog] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Create Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    patient_id: '',
    doctor_id: '',
    priority: 'routine',
    clinical_notes: '',
    test_ids: [],
  });

  // Results Entry Modal State
  const [activeOrder, setActiveOrder] = useState(null);
  const [resultsForm, setResultsForm] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await client.get('/lab-orders', { params });
      setOrders(data.data || []);
      setLastPage(data.last_page || 1);
    } catch (err) {
      console.error('Failed to load lab orders', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [testRes, ptRes, docRes] = await Promise.all([
        client.get('/lab-tests/catalog'),
        client.get('/patients', { params: { per_page: 100 } }),
        client.get('/doctors', { params: { per_page: 100 } }),
      ]);
      setTestCatalog(testRes.data.tests || []);
      setPatients(ptRes.data.data || []);
      setDoctors(docRes.data.data || []);
    } catch (err) {
      console.error('Failed to load lab metadata', err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (orderForm.test_ids.length === 0) {
      setError('Please select at least one laboratory test.');
      return;
    }
    try {
      const { data } = await client.post('/lab-orders', orderForm);
      setMessage(data.message);
      setShowOrderModal(false);
      setOrderForm({ patient_id: '', doctor_id: '', priority: 'routine', clinical_notes: '', test_ids: [] });
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit lab order.');
    }
  };

  const openResultsModal = (order) => {
    setActiveOrder(order);
    const initial = {};
    (order.results || []).forEach((res) => {
      initial[res.id] = {
        result_value: res.result_value || '',
        is_abnormal: Boolean(res.is_abnormal),
        findings_summary: res.findings_summary || '',
      };
    });
    setResultsForm(initial);
  };

  const handleSaveResults = async (e) => {
    e.preventDefault();
    if (!activeOrder) return;
    setError('');
    setMessage('');
    try {
      const payload = {
        results: Object.entries(resultsForm).map(([id, val]) => ({
          id: Number(id),
          result_value: val.result_value,
          is_abnormal: val.is_abnormal,
          findings_summary: val.findings_summary,
        })),
      };
      const { data } = await client.put(`/lab-orders/${activeOrder.id}/results`, payload);
      setMessage(data.message);
      setActiveOrder(null);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save diagnostic findings.');
    }
  };

  const toggleTestSelection = (testId) => {
    setOrderForm((prev) => {
      const exists = prev.test_ids.includes(testId);
      return {
        ...prev,
        test_ids: exists ? prev.test_ids.filter((id) => id !== testId) : [...prev.test_ids, testId],
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h2>Laboratory & Diagnostic Investigations</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Diagnostic requisitions, observation logs, specimen results, and abnormal finding alerts.
          </p>
        </div>
        {canOrder && (
          <button className="btn btn-primary" onClick={() => { setError(''); setShowOrderModal(true); }}>
            <Plus size={16} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Requisition Lab Order
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

      {/* Filter & Search Bar */}
      <div className="toolbar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search by order ID or patient name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Lab Orders Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-soft)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Order ID</th>
              <th style={{ padding: '0.85rem 1rem' }}>Patient</th>
              <th style={{ padding: '0.85rem 1rem' }}>Doctor</th>
              <th style={{ padding: '0.85rem 1rem' }}>Panels / Tests</th>
              <th style={{ padding: '0.85rem 1rem' }}>Priority</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                  Loading diagnostic investigations...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                  No lab orders found. Click "Requisition Lab Order" to request tests.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>
                    {order.order_number}
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--muted)' }}>
                      {new Date(order.ordered_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                    {order.patient?.name}
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--muted)' }}>
                      {order.patient?.code}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    Dr. {order.doctor?.user?.name || 'Hospital Clinician'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(order.results || []).map((res) => (
                        <span
                          key={res.id}
                          className="badge"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            background: res.is_abnormal ? 'var(--danger-soft)' : 'var(--surface-soft)',
                            color: res.is_abnormal ? 'var(--danger)' : 'var(--text)',
                            border: `1px solid ${res.is_abnormal ? 'var(--danger)' : 'var(--border)'}`,
                          }}
                        >
                          {res.lab_test?.name}
                          {res.is_abnormal && ' ⚠'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {order.priority === 'stat' ? (
                      <span className="badge badge-danger" style={{ fontWeight: 800 }}>STAT (Immediate)</span>
                    ) : order.priority === 'urgent' ? (
                      <span className="badge badge-warning" style={{ fontWeight: 700 }}>Urgent</span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--surface-soft)' }}>Routine</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      className={`badge ${order.status === 'completed' ? 'badge-success' : 'badge-warning'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => openResultsModal(order)}
                      className={`btn btn-sm ${order.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {order.status === 'completed' ? 'View Findings' : 'Enter Results'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} lastPage={lastPage} onChange={setPage} />

      {/* Modal: Requisition New Lab Order */}
      {showOrderModal && (
        <Modal title="Requisition Diagnostic Laboratory Order" onClose={() => setShowOrderModal(false)}>
          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Select Patient *
              </label>
              <select
                value={orderForm.patient_id}
                onChange={(e) => setOrderForm({ ...orderForm, patient_id: e.target.value })}
                required
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
                  Attending Doctor
                </label>
                <select
                  value={orderForm.doctor_id}
                  onChange={(e) => setOrderForm({ ...orderForm, doctor_id: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                >
                  <option value="">-- Attending Clinician --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user?.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Clinical Priority *
                </label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                >
                  <option value="routine">Routine (Standard)</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT (Critical / Emergency)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Diagnostic Tests to Perform (Check all required) *
              </label>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem' }}>
                {testCatalog.map((t) => (
                  <label
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={orderForm.test_ids.includes(t.id)}
                      onChange={() => toggleTestSelection(t.id)}
                    />
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>({t.category})</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--primary-dark)' }}>
                      ₦{Number(t.price).toLocaleString()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Provisional Diagnosis / Clinical Indications
              </label>
              <textarea
                rows={2}
                value={orderForm.clinical_notes}
                onChange={(e) => setOrderForm({ ...orderForm, clinical_notes: e.target.value })}
                placeholder="e.g. Acute abdominal colic, evaluate WBC and electrolytes..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowOrderModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Requisition
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Record Diagnostic Findings */}
      {activeOrder && (
        <Modal
          title={`Diagnostic Findings · ${activeOrder.order_number}`}
          onClose={() => setActiveOrder(null)}
        >
          <form onSubmit={handleSaveResults} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.6rem 0.8rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <strong>Patient:</strong> {activeOrder.patient?.name} ({activeOrder.patient?.code})
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {(activeOrder.results || []).map((res) => {
                const current = resultsForm[res.id] || {};
                return (
                  <div
                    key={res.id}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      background: current.is_abnormal ? 'var(--danger-soft)' : 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{res.lab_test?.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        Ref: {res.reference_range || res.lab_test?.normal_range || 'Normal'} ({res.lab_test?.unit || '-'})
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div>
                        <input
                          type="text"
                          placeholder="Measured result value..."
                          value={current.result_value || ''}
                          onChange={(e) =>
                            setResultsForm({
                              ...resultsForm,
                              [res.id]: { ...current, result_value: e.target.value },
                            })
                          }
                          style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        />
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(current.is_abnormal)}
                          onChange={(e) =>
                            setResultsForm({
                              ...resultsForm,
                              [res.id]: { ...current, is_abnormal: e.target.checked },
                            })
                          }
                        />
                        ⚠ Flag as Abnormal Finding
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="Technician observation / morphology notes..."
                      value={current.findings_summary || ''}
                      onChange={(e) =>
                        setResultsForm({
                          ...resultsForm,
                          [res.id]: { ...current, findings_summary: e.target.value },
                        })
                      }
                      style={{ width: '100%', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8rem' }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setActiveOrder(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Verify & Finalize Report
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

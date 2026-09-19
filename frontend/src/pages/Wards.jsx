import { useEffect, useState } from 'react';
import { BedDouble, CheckCircle, RefreshCw, AlertTriangle, User, Calendar, Stethoscope, Download } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Wards() {
  const { user } = useAuth();
  const canManage = ['admin', 'receptionist', 'doctor'].includes(user?.role);

  const [wards, setWards] = useState([]);
  const [stats, setStats] = useState({ total_beds: 0, occupied_beds: 0, available_beds: 0, sanitizing_beds: 0, occupancy_rate: 0 });
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBed, setActiveBed] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadWards = async () => {
    try {
      const { data } = await client.get('/wards');
      setWards(data.wards || []);
      setStats(data.stats || {});
      if (!selectedWardId && data.wards?.length > 0) {
        setSelectedWardId(data.wards[0].id);
      }
    } catch (err) {
      console.error('Failed to load wards', err);
    }
  };

  const loadBeds = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedWardId) params.ward_id = selectedWardId;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await client.get('/beds', { params });
      setBeds(data.beds || []);
    } catch (err) {
      console.error('Failed to load beds', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWards();
  }, []);

  useEffect(() => {
    loadBeds();
  }, [selectedWardId, statusFilter]);

  const updateStatus = async (bedId, newStatus) => {
    setMessage('');
    setError('');
    try {
      const { data } = await client.put(`/beds/${bedId}/status`, { status: newStatus });
      setMessage(data.message);
      setActiveBed(null);
      loadBeds();
      loadWards();
    } catch (err) {
      setError(err.response?.data?.message || 'Status update failed.');
    }
  };

  const dischargeBed = async (bed) => {
    if (!confirm(`Discharge patient ${bed.current_admission?.patient?.name || ''} and cycle Bed ${bed.bed_number} to sanitizing?`)) return;
    setMessage('');
    setError('');
    try {
      const { data } = await client.post(`/beds/${bed.id}/discharge`, {});
      setMessage(data.message);
      setActiveBed(null);
      loadBeds();
      loadWards();
    } catch (err) {
      setError(err.response?.data?.message || 'Discharge failed.');
    }
  };

  const downloadDischargeSummary = (admissionId) => {
    window.open(`/documents/discharge-summary/${admissionId}`, '_blank');
  };

  const currentWard = wards.find((w) => w.id === selectedWardId);

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h2>Visual Ward & Bed Matrix</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Real-time floor occupancy, bed availability tracking, and patient turnover sanitization.
          </p>
        </div>
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

      {/* KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Capacity</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{stats.total_beds}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Hospital beds registered</div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase' }}>Available</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>{stats.available_beds}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Ready for intake</div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase' }}>Occupied</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>{stats.occupied_beds}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Inpatients admitted</div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase' }}>Sanitizing</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>{stats.sanitizing_beds}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Turnover cleaning</div>
        </div>

        <div className="card" style={{ padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>Occupancy Rate</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{stats.occupancy_rate}%</div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '999px', marginTop: '0.4rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(stats.occupancy_rate, 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
          </div>
        </div>
      </div>

      {/* Ward Selector & Filter Controls */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          {/* Ward Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {wards.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWardId(w.id)}
                className="btn"
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius)',
                  background: selectedWardId === w.id ? 'var(--nav)' : 'var(--surface-soft)',
                  color: selectedWardId === w.id ? '#fff' : 'var(--text)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                {w.name} ({w.occupied_beds_count || 0}/{w.beds_count || 0})
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
            >
              <option value="all">All Beds</option>
              <option value="available">🟢 Available Only</option>
              <option value="occupied">🔴 Occupied Only</option>
              <option value="sanitizing">🟡 Sanitizing Only</option>
              <option value="maintenance">⚪ Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visual Bed Grid Floor Matrix */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              {currentWard ? currentWard.name : 'Ward Floor Matrix'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Floor {currentWard?.floor || 1} · Department: {currentWard?.department || 'General Care'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 500 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }}></span> Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)' }}></span> Occupied
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)' }}></span> Sanitizing
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading bed statuses...</div>
        ) : beds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>No beds found in this ward matching filter.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem' }}>
            {beds.map((bed) => {
              const isOccupied = bed.status === 'occupied';
              const isAvailable = bed.status === 'available';
              const isSanitizing = bed.status === 'sanitizing';

              const statusColor = isAvailable ? 'var(--success)' : isOccupied ? 'var(--danger)' : isSanitizing ? 'var(--warning)' : 'var(--muted)';

              return (
                <div
                  key={bed.id}
                  onClick={() => setActiveBed(bed)}
                  className="card"
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `1.5px solid ${statusColor}`,
                    background: isAvailable ? 'rgba(22, 131, 93, 0.04)' : isOccupied ? 'rgba(217, 79, 92, 0.05)' : isSanitizing ? 'rgba(184, 111, 8, 0.05)' : 'var(--surface-soft)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{bed.bed_number}</span>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor }}></span>
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                      {bed.bed_type}
                    </div>

                    {isOccupied && bed.current_admission?.patient ? (
                      <div style={{ marginTop: '0.4rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)' }}>
                          {bed.current_admission.patient.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          MRN: {bed.current_admission.patient.code}
                        </div>
                      </div>
                    ) : isAvailable ? (
                      <div style={{ marginTop: '0.4rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--success)' }}>
                          Ready for Intake
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          ₦{Number(bed.daily_rate || 0).toLocaleString()}/day
                        </div>
                      </div>
                    ) : isSanitizing ? (
                      <div style={{ marginTop: '0.4rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--warning)' }}>
                          Turnover Sanitizing
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Cleaning in progress</div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Maintenance
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bed Details & Action Inspection Modal */}
      {activeBed && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
          onClick={() => setActiveBed(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>
                  {activeBed.ward?.name || 'Inpatient Ward'}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{activeBed.bed_number} · {activeBed.bed_type}</h3>
              </div>
              <button onClick={() => setActiveBed(null)} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>✕</button>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Current Status:</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                  {activeBed.status}
                </span>
              </div>

              {activeBed.current_admission && (
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--danger)', background: 'var(--danger-soft)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--danger)' }}>
                    Admitted Inpatient
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.2rem' }}>
                    {activeBed.current_admission.patient?.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    MRN: {activeBed.current_admission.patient?.code}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
                    <strong>Diagnosis:</strong> {activeBed.current_admission.diagnosis || 'Clinical inpatient care'}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    <strong>Attending Doctor:</strong> Dr. {activeBed.current_admission.doctor?.user?.name || 'Duty Clinician'}
                  </div>

                  <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => downloadDischargeSummary(activeBed.current_admission.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Download size={14} /> PDF Summary
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => dischargeBed(activeBed)}
                        className="btn btn-danger"
                        style={{ fontSize: '0.8rem' }}
                      >
                        Complete Discharge
                      </button>
                    )}
                  </div>
                </div>
              )}

              {canManage && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Change Bed Operational Status
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {activeBed.status !== 'available' && (
                      <button
                        onClick={() => updateStatus(activeBed.id, 'available')}
                        className="btn"
                        style={{ fontSize: '0.8rem', background: 'var(--primary-soft)', color: 'var(--primary-dark)', border: '1px solid var(--primary)' }}
                      >
                        ✓ Mark Available
                      </button>
                    )}
                    {activeBed.status !== 'sanitizing' && (
                      <button
                        onClick={() => updateStatus(activeBed.id, 'sanitizing')}
                        className="btn"
                        style={{ fontSize: '0.8rem', background: 'rgba(184, 111, 8, 0.1)', color: 'var(--warning)', border: '1px solid var(--warning)' }}
                      >
                        🧹 Mark Sanitizing
                      </button>
                    )}
                    {activeBed.status !== 'maintenance' && (
                      <button
                        onClick={() => updateStatus(activeBed.id, 'maintenance')}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem' }}
                      >
                        🔧 Maintenance
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HeartPulse, Plus, AlertTriangle, ArrowLeft, Trash2, Activity, User, ShieldAlert } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function PatientVitals() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = ['admin', 'doctor', 'receptionist'].includes(user?.role);
  const canManageAllergies = ['admin', 'doctor'].includes(user?.role);

  const [patient, setPatient] = useState(null);
  const [latest, setLatest] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Vitals Form
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    temperature: '',
    spo2: '',
    respiratory_rate: '',
    weight_kg: '',
    height_cm: '',
    clinical_notes: '',
  });

  // New Allergy Form
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [allergyForm, setAllergyForm] = useState({
    allergen: '',
    allergy_type: 'drug',
    reaction: '',
    severity: 'moderate',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadVitalsAndAllergies = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/patients/${id}/vitals`);
      setPatient(data.patient);
      setLatest(data.latest);
      setVitals(data.vitals || []);
      setAllergies(data.allergies || []);
    } catch (err) {
      console.error('Failed to load patient vitals', err);
      setError('Failed to load clinical vitals for this patient.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVitalsAndAllergies();
  }, [id]);

  const handleRecordVital = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await client.post(`/patients/${id}/vitals`, vitalForm);
      setMessage(data.message);
      setShowVitalModal(false);
      setVitalForm({
        systolic_bp: '',
        diastolic_bp: '',
        heart_rate: '',
        temperature: '',
        spo2: '',
        respiratory_rate: '',
        weight_kg: '',
        height_cm: '',
        clinical_notes: '',
      });
      loadVitalsAndAllergies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record vitals.');
    }
  };

  const handleAddAllergy = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await client.post(`/patients/${id}/allergies`, allergyForm);
      setMessage(data.message);
      setShowAllergyModal(false);
      setAllergyForm({ allergen: '', allergy_type: 'drug', reaction: '', severity: 'moderate' });
      loadVitalsAndAllergies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add allergy.');
    }
  };

  const handleDeleteAllergy = async (allergyId) => {
    if (!confirm('Remove this allergy record?')) return;
    try {
      await client.delete(`/allergies/${allergyId}`);
      loadVitalsAndAllergies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete allergy.');
    }
  };

  // Compute live BMI for form
  const liveBmi =
    vitalForm.height_cm > 0 && vitalForm.weight_kg > 0
      ? (vitalForm.weight_kg / Math.pow(vitalForm.height_cm / 100, 2)).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to="/patients" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem' }}>
          <ArrowLeft size={16} /> Back to Patients
        </Link>
        <div>
          <h2>Patient Vitals & Allergy Passport</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Biometric telemetry, emergency triage acuity, BMI auto-calculation, and active allergy safeguards.
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

      {/* Patient Header Card */}
      {patient && (
        <div className="card" style={{ padding: '1.25rem', background: 'var(--surface-soft)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                Electronic Medical Record
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{patient.name}</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                <span>MRN: <strong>{patient.code}</strong></span>
                <span>Gender: <strong style={{ textTransform: 'capitalize' }}>{patient.gender || 'Unspecified'}</strong></span>
                <span>Blood Group: <strong>{patient.blood_group || 'Unknown'}</strong></span>
              </div>
            </div>

            {canEdit && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {canManageAllergies && (
                  <button className="btn btn-secondary" onClick={() => setShowAllergyModal(true)}>
                    <ShieldAlert size={15} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Add Allergy
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => setShowVitalModal(true)}>
                  <HeartPulse size={15} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Record New Vitals
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Allergies Alert Banner */}
      <div className="card" style={{ padding: '1.25rem', borderLeft: allergies.length > 0 ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: allergies.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
            <AlertTriangle size={18} /> Active Allergy Safeguards ({allergies.length})
          </h4>
        </div>

        {allergies.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            No known drug or environmental allergies recorded for this patient.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {allergies.map((alg) => (
              <div
                key={alg.id}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius)',
                  background: 'var(--danger-soft)',
                  border: '1px solid var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--danger)' }}>{alg.allergen}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '0.35rem' }}>
                    ({alg.allergy_type}) · {alg.reaction || 'Anaphylaxis risk'}
                  </span>
                </div>
                <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                  {alg.severity}
                </span>
                {canManageAllergies && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAllergy(alg.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Vitals Telemetry Card */}
      {latest && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Most Recent Clinical Observations</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Recorded: {new Date(latest.recorded_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span
                className={`badge ${latest.triage_category === 'emergency' ? 'badge-danger' : latest.triage_category === 'urgent' ? 'badge-warning' : 'badge-success'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', textTransform: 'uppercase', fontWeight: 800 }}
              >
                Triage: {latest.triage_category}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Blood Pressure</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {latest.systolic_bp && latest.diastolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : 'N/A'}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--muted)' }}> mmHg</span>
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Heart Rate</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {latest.heart_rate || 'N/A'}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--muted)' }}> bpm</span>
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Oxygen SpO2</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: latest.spo2 < 95 ? 'var(--danger)' : 'inherit' }}>
                {latest.spo2 ? `${latest.spo2}%` : 'N/A'}
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Temperature</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {latest.temperature ? `${latest.temperature}°C` : 'N/A'}
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Resp. Rate</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {latest.respiratory_rate ? `${latest.respiratory_rate}/min` : 'N/A'}
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--surface-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Calculated BMI</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--primary-dark)' }}>
                {latest.bmi || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Vitals Table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Vitals Log & Trend History</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-soft)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.65rem' }}>Recorded At</th>
                <th style={{ padding: '0.65rem' }}>Blood Pressure</th>
                <th style={{ padding: '0.65rem' }}>Pulse</th>
                <th style={{ padding: '0.65rem' }}>SpO2</th>
                <th style={{ padding: '0.65rem' }}>Temp</th>
                <th style={{ padding: '0.65rem' }}>Weight/Height</th>
                <th style={{ padding: '0.65rem' }}>BMI</th>
                <th style={{ padding: '0.65rem' }}>Acuity</th>
              </tr>
            </thead>
            <tbody>
              {vitals.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    No vitals recorded yet.
                  </td>
                </tr>
              ) : (
                vitals.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.65rem', fontSize: '0.85rem' }}>
                      {new Date(v.recorded_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.65rem', fontWeight: 700 }}>
                      {v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '-'}
                    </td>
                    <td style={{ padding: '0.65rem' }}>{v.heart_rate ? `${v.heart_rate} bpm` : '-'}</td>
                    <td style={{ padding: '0.65rem' }}>{v.spo2 ? `${v.spo2}%` : '-'}</td>
                    <td style={{ padding: '0.65rem' }}>{v.temperature ? `${v.temperature}°C` : '-'}</td>
                    <td style={{ padding: '0.65rem', fontSize: '0.85rem' }}>
                      {v.weight_kg ? `${v.weight_kg}kg` : '-'} / {v.height_cm ? `${v.height_cm}cm` : '-'}
                    </td>
                    <td style={{ padding: '0.65rem', fontWeight: 700 }}>{v.bmi || '-'}</td>
                    <td style={{ padding: '0.65rem' }}>
                      <span className={`badge ${v.triage_category === 'emergency' ? 'badge-danger' : v.triage_category === 'urgent' ? 'badge-warning' : 'badge-success'}`}>
                        {v.triage_category}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record New Vitals */}
      {showVitalModal && (
        <Modal title="Record Clinical Vitals & Biometrics" onClose={() => setShowVitalModal(false)}>
          <form onSubmit={handleRecordVital} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Systolic BP (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="120"
                  value={vitalForm.systolic_bp}
                  onChange={(e) => setVitalForm({ ...vitalForm, systolic_bp: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Diastolic BP (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="80"
                  value={vitalForm.diastolic_bp}
                  onChange={(e) => setVitalForm({ ...vitalForm, diastolic_bp: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  placeholder="72"
                  value={vitalForm.heart_rate}
                  onChange={(e) => setVitalForm({ ...vitalForm, heart_rate: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  SpO2 (%)
                </label>
                <input
                  type="number"
                  placeholder="98"
                  value={vitalForm.spo2}
                  onChange={(e) => setVitalForm({ ...vitalForm, spo2: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="36.8"
                  value={vitalForm.temperature}
                  onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70.5"
                  value={vitalForm.weight_kg}
                  onChange={(e) => setVitalForm({ ...vitalForm, weight_kg: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Height (cm)
                </label>
                <input
                  type="number"
                  placeholder="175"
                  value={vitalForm.height_cm}
                  onChange={(e) => setVitalForm({ ...vitalForm, height_cm: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Live BMI
                </label>
                <div style={{ padding: '0.55rem', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: 800 }}>
                  {liveBmi || 'Enter W & H'}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Clinical Observations
              </label>
              <textarea
                rows={2}
                value={vitalForm.clinical_notes}
                onChange={(e) => setVitalForm({ ...vitalForm, clinical_notes: e.target.value })}
                placeholder="e.g. Patient well perfused, afebrile, alert..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowVitalModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Vitals Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Allergy */}
      {showAllergyModal && (
        <Modal title="Add Patient Allergy Safeguard" onClose={() => setShowAllergyModal(false)}>
          <form onSubmit={handleAddAllergy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Allergen / Substance *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                value={allergyForm.allergen}
                onChange={(e) => setAllergyForm({ ...allergyForm, allergen: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Allergy Type
                </label>
                <select
                  value={allergyForm.allergy_type}
                  onChange={(e) => setAllergyForm({ ...allergyForm, allergy_type: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                >
                  <option value="drug">Drug / Medication</option>
                  <option value="food">Food</option>
                  <option value="environmental">Environmental</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Severity Level
                </label>
                <select
                  value={allergyForm.severity}
                  onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                >
                  <option value="mild">Mild (Rash, itching)</option>
                  <option value="moderate">Moderate (Urticaria, swelling)</option>
                  <option value="severe">Severe (Anaphylaxis risk)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Clinical Reaction Description
              </label>
              <input
                type="text"
                placeholder="e.g. Angioedema, broncho-constriction"
                value={allergyForm.reaction}
                onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowAllergyModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Allergy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Pill, Plus, Search, AlertTriangle, PackageCheck, History } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

export default function Pharmacy() {
  const { user } = useAuth();
  const canAdd = user?.role === 'admin';
  const canDispense = ['admin', 'doctor', 'receptionist'].includes(user?.role);

  const [medicines, setMedicines] = useState([]);
  const [stats, setStats] = useState({ total_stock_value: 0, low_stock_count: 0, categories: [] });
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Medicine Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({
    brand_name: '',
    generic_name: '',
    category: 'Antibiotics',
    dosage_form: 'tablet',
    strength: '',
    unit_cost: '',
    selling_price: '',
    stock_quantity: '',
    reorder_level: 20,
    batch_number: '',
    expiry_date: '',
  });

  // Dispense Modal State
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [dispenseMed, setDispenseMed] = useState(null);
  const [dispensePatientId, setDispensePatientId] = useState('');
  const [dispenseQty, setDispenseQty] = useState(1);
  const [dispenseInstructions, setDispenseInstructions] = useState('');
  const [patients, setPatients] = useState([]);

  // Dispensations History Log
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [dispensations, setDispensations] = useState([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (category !== 'all') params.category = category;
      if (lowStockOnly) params.low_stock_only = 1;
      const { data } = await client.get('/pharmacy/medicines', { params });
      setMedicines(data.medicines?.data || []);
      setLastPage(data.medicines?.last_page || 1);
      setStats(data.stats || { total_stock_value: 0, low_stock_count: 0, categories: [] });
    } catch (err) {
      console.error('Failed to load pharmacy medicines', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const { data } = await client.get('/patients', { params: { per_page: 100 } });
      setPatients(data.data || []);
    } catch (err) {
      console.error('Failed to load patients', err);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, [page, search, category, lowStockOnly]);

  useEffect(() => {
    loadPatients();
  }, []);

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const { data } = await client.post('/pharmacy/medicines', newMed);
      setMessage(data.message);
      setShowAddModal(false);
      setNewMed({
        brand_name: '',
        generic_name: '',
        category: 'Antibiotics',
        dosage_form: 'tablet',
        strength: '',
        unit_cost: '',
        selling_price: '',
        stock_quantity: '',
        reorder_level: 20,
        batch_number: '',
        expiry_date: '',
      });
      loadMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save medication.');
    }
  };

  const openDispense = (med) => {
    setDispenseMed(med);
    setDispenseQty(1);
    setDispenseInstructions('');
    setShowDispenseModal(true);
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        medicine_id: dispenseMed.id,
        patient_id: dispensePatientId,
        quantity: dispenseQty,
        instructions: dispenseInstructions,
      };
      const { data } = await client.post('/pharmacy/dispense', payload);
      setMessage(data.message);
      setShowDispenseModal(false);
      loadMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Dispensation failed.');
    }
  };

  const loadDispensations = async () => {
    try {
      const { data } = await client.get('/pharmacy/dispensations');
      setDispensations(data.data || []);
      setShowHistoryModal(true);
    } catch (err) {
      console.error('Failed to load dispensations', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <h2>Pharmacy Formulary & Dispenser</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Medication inventory levels, lot expiry monitoring, prescription dispensing, and stock tracking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={loadDispensations}>
            <History size={15} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Dispensation Log
          </button>
          {canAdd && (
            <button className="btn btn-primary" onClick={() => { setError(''); setShowAddModal(true); }}>
              <Plus size={15} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Register Medication
            </button>
          )}
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

      {/* Inventory KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Stock Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text)' }}>
            ₦{Number(stats.total_stock_value || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>On-shelf retail inventory</div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase' }}>Low Stock Warnings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>
            {stats.low_stock_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Formulations below reorder level</div>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>Categories</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
            {stats.categories?.length || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Distinct therapeutic groups</div>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search brand or generic name (e.g. Augmentin, Paracetamol)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          />
        </div>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
        >
          <option value="all">All Categories</option>
          {(stats.categories || []).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0 0.5rem' }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
          />
          <span style={{ fontWeight: 600, color: lowStockOnly ? 'var(--danger)' : 'inherit' }}>Low Stock Only</span>
        </label>
      </div>

      {/* Medicines Table */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-soft)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Medication Name</th>
              <th style={{ padding: '0.85rem 1rem' }}>Dosage Form & Strength</th>
              <th style={{ padding: '0.85rem 1rem' }}>Category</th>
              <th style={{ padding: '0.85rem 1rem' }}>Stock Qty</th>
              <th style={{ padding: '0.85rem 1rem' }}>Unit Price</th>
              <th style={{ padding: '0.85rem 1rem' }}>Batch / Expiry</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                  Loading pharmacy inventory...
                </td>
              </tr>
            ) : medicines.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                  No medications found matching search criteria.
                </td>
              </tr>
            ) : (
              medicines.map((med) => {
                const isLow = med.stock_quantity <= med.reorder_level;
                return (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>
                      {med.brand_name}
                      <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--muted)' }}>
                        {med.generic_name}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{med.dosage_form}</span> · {med.strength || 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge" style={{ background: 'var(--surface-soft)' }}>
                        {med.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--text)' }}>
                        {med.stock_quantity} units
                      </span>
                      {isLow && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>
                          ⚠ Reorder (Min {med.reorder_level})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                      ₦{Number(med.selling_price).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                      <div>Lot: {med.batch_number || 'N/A'}</div>
                      <div style={{ color: 'var(--muted)' }}>
                        Exp: {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {canDispense && (
                        <button
                          disabled={med.stock_quantity <= 0}
                          onClick={() => openDispense(med)}
                          className="btn btn-sm btn-primary"
                          style={{ opacity: med.stock_quantity <= 0 ? 0.5 : 1 }}
                        >
                          Dispense Rx
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} lastPage={lastPage} onChange={setPage} />

      {/* Modal: Register New Medication */}
      {showAddModal && (
        <Modal title="Register Medication in Pharmacy" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Augmentin"
                  value={newMed.brand_name}
                  onChange={(e) => setNewMed({ ...newMed, brand_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Generic / Molecule *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin / Clavulanate"
                  value={newMed.generic_name}
                  onChange={(e) => setNewMed({ ...newMed, generic_name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Category</label>
                <input
                  type="text"
                  placeholder="Antibiotic"
                  value={newMed.category}
                  onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Form</label>
                <select
                  value={newMed.dosage_form}
                  onChange={(e) => setNewMed({ ...newMed, dosage_form: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                >
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="ointment">Ointment</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Strength</label>
                <input
                  type="text"
                  placeholder="625mg"
                  value={newMed.strength}
                  onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Selling Price (₦) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="4500"
                  value={newMed.selling_price}
                  onChange={(e) => setNewMed({ ...newMed, selling_price: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Initial Stock *</label>
                <input
                  type="number"
                  required
                  placeholder="100"
                  value={newMed.stock_quantity}
                  onChange={(e) => setNewMed({ ...newMed, stock_quantity: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Reorder Level</label>
                <input
                  type="number"
                  placeholder="20"
                  value={newMed.reorder_level}
                  onChange={(e) => setNewMed({ ...newMed, reorder_level: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Batch / Lot</label>
                <input
                  type="text"
                  placeholder="LOT-99201"
                  value={newMed.batch_number}
                  onChange={(e) => setNewMed({ ...newMed, batch_number: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Expiry Date</label>
                <input
                  type="date"
                  value={newMed.expiry_date}
                  onChange={(e) => setNewMed({ ...newMed, expiry_date: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save to Inventory
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Dispense Medication */}
      {showDispenseModal && dispenseMed && (
        <Modal title={`Dispense Rx · ${dispenseMed.brand_name}`} onClose={() => setShowDispenseModal(false)}>
          <form onSubmit={handleDispense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Select Patient *
              </label>
              <select
                required
                value={dispensePatientId}
                onChange={(e) => setDispensePatientId(e.target.value)}
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
                  Quantity to Dispense *
                </label>
                <input
                  type="number"
                  min="1"
                  max={dispenseMed.stock_quantity}
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  In Stock: {dispenseMed.stock_quantity} units
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Total Bill
                </label>
                <div style={{ padding: '0.55rem', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: 800, color: 'var(--primary-dark)' }}>
                  ₦{Number(dispenseQty * dispenseMed.selling_price).toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Label Instructions / Dosage Schedule
              </label>
              <input
                type="text"
                placeholder="e.g. 1 tab twice daily after food for 5 days"
                value={dispenseInstructions}
                onChange={(e) => setDispenseInstructions(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowDispenseModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm Dispense
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Dispensations Log */}
      {showHistoryModal && (
        <Modal title="Recent Pharmacy Dispensations" onClose={() => setShowHistoryModal(false)}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-soft)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.5rem' }}>Medication</th>
                  <th style={{ padding: '0.5rem' }}>Patient</th>
                  <th style={{ padding: '0.5rem' }}>Qty</th>
                  <th style={{ padding: '0.5rem' }}>Total</th>
                  <th style={{ padding: '0.5rem' }}>Dispensed At</th>
                </tr>
              </thead>
              <tbody>
                {dispensations.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted)' }}>
                      No dispensations recorded yet.
                    </td>
                  </tr>
                ) : (
                  dispensations.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{d.medicine?.brand_name}</td>
                      <td style={{ padding: '0.5rem' }}>{d.patient?.name}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 700 }}>{d.quantity}</td>
                      <td style={{ padding: '0.5rem' }}>₦{Number(d.total_amount).toLocaleString()}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {new Date(d.dispensed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

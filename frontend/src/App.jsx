import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import Appointments from './pages/Appointments';
import Admissions from './pages/Admissions';
import MedicalRecords from './pages/MedicalRecords';
import Prescriptions from './pages/Prescriptions';
import Billing from './pages/Billing';
import Users from './pages/Users';
import Availability from './pages/Availability';
import Wards from './pages/Wards';
import Laboratory from './pages/Laboratory';
import Pharmacy from './pages/Pharmacy';
import Insurance from './pages/Insurance';
import PatientVitals from './pages/PatientVitals';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={
          <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}><Patients /></ProtectedRoute>} />
        <Route path="/patients/:id/vitals" element={
          <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}><PatientVitals /></ProtectedRoute>} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/wards" element={
          <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}><Wards /></ProtectedRoute>} />
        <Route path="/laboratory" element={
          <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}><Laboratory /></ProtectedRoute>} />
        <Route path="/pharmacy" element={
          <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}><Pharmacy /></ProtectedRoute>} />
        <Route path="/medical-records" element={<MedicalRecords />} />
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/insurance" element={
          <ProtectedRoute roles={['admin', 'receptionist']}><Insurance /></ProtectedRoute>} />
        <Route path="/users" element={
          <ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
        <Route path="/availability" element={
          <ProtectedRoute roles={['doctor']}><Availability /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

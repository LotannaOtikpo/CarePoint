<?php

use App\Http\Controllers\AdmissionController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AppointmentPaymentController;
use App\Http\Controllers\InsuranceClaimController;
use App\Http\Controllers\LabOrderController;
use App\Http\Controllers\PatientVitalController;
use App\Http\Controllers\PharmacyController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WardBedController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/payments/razorpay/webhook', [AppointmentPaymentController::class, 'webhook']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Doctors: everyone can browse (needed for booking); admin manages.
    Route::get('/doctors', [DoctorController::class, 'index']);
    Route::get('/doctors/{doctor}', [DoctorController::class, 'show']);
    Route::middleware('role:admin')->group(function () {
        Route::post('/doctors', [DoctorController::class, 'store']);
        Route::put('/doctors/{doctor}', [DoctorController::class, 'update']);
        Route::delete('/doctors/{doctor}', [DoctorController::class, 'destroy']);
    });
    Route::put('/doctors/{doctor}/availability', [DoctorController::class, 'setAvailability'])
        ->middleware('role:admin,doctor');

    // Patients
    Route::middleware('role:admin,receptionist,doctor')->group(function () {
        Route::get('/patients', [PatientController::class, 'index']);
        Route::get('/patients/{patient}', [PatientController::class, 'show']);
    });
    Route::middleware('role:admin,receptionist')->group(function () {
        Route::post('/patients', [PatientController::class, 'store']);
        Route::put('/patients/{patient}', [PatientController::class, 'update']);
        Route::delete('/patients/{patient}', [PatientController::class, 'destroy']);
    });

    // Appointments (controller scopes rows by role)
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show']);
    Route::post('/appointments', [AppointmentController::class, 'store'])
        ->middleware('role:admin,receptionist,patient');
    Route::middleware('role:patient')->group(function () {
        Route::post('/appointment-payments/order', [AppointmentPaymentController::class, 'createOrder']);
        Route::post('/appointment-payments/{appointment}/verify', [AppointmentPaymentController::class, 'verify']);
        Route::post('/appointment-payments/{appointment}/cancel', [AppointmentPaymentController::class, 'cancel']);
    });
    Route::put('/appointments/{appointment}', [AppointmentController::class, 'update']);
    Route::delete('/appointments/{appointment}', [AppointmentController::class, 'destroy'])
        ->middleware('role:admin,receptionist');

    // Admissions
    Route::get('/admissions', [AdmissionController::class, 'index']);
    Route::get('/admissions/{admission}', [AdmissionController::class, 'show']);
    Route::middleware('role:admin,receptionist')->group(function () {
        Route::post('/admissions', [AdmissionController::class, 'store']);
        Route::put('/admissions/{admission}', [AdmissionController::class, 'update']);
        Route::post('/admissions/{admission}/discharge', [AdmissionController::class, 'discharge']);
        Route::delete('/admissions/{admission}', [AdmissionController::class, 'destroy']);
    });

    // Medical records
    Route::get('/medical-records', [MedicalRecordController::class, 'index']);
    Route::get('/medical-records/{medicalRecord}', [MedicalRecordController::class, 'show']);
    Route::middleware('role:admin,doctor')->group(function () {
        Route::post('/medical-records', [MedicalRecordController::class, 'store']);
        Route::put('/medical-records/{medicalRecord}', [MedicalRecordController::class, 'update']);
        Route::delete('/medical-records/{medicalRecord}', [MedicalRecordController::class, 'destroy']);
    });

    // Prescriptions
    Route::get('/prescriptions', [PrescriptionController::class, 'index']);
    Route::get('/prescriptions/{prescription}', [PrescriptionController::class, 'show']);
    Route::middleware('role:admin,doctor')->group(function () {
        Route::post('/prescriptions', [PrescriptionController::class, 'store']);
        Route::put('/prescriptions/{prescription}', [PrescriptionController::class, 'update']);
        Route::delete('/prescriptions/{prescription}', [PrescriptionController::class, 'destroy']);
    });

    // Billing
    Route::get('/bills', [BillController::class, 'index']);
    Route::get('/bills/{bill}', [BillController::class, 'show']);
    Route::middleware('role:admin,receptionist')->group(function () {
        Route::post('/bills', [BillController::class, 'store']);
        Route::put('/bills/{bill}/status', [BillController::class, 'updateStatus']);
        Route::post('/bills/{bill}/pay', [BillController::class, 'pay']);
        Route::post('/bills/{bill}/cancel', [BillController::class, 'cancel']);
    });
    Route::middleware('role:admin')->group(function () {
        Route::delete('/bills/{bill}', [BillController::class, 'destroy']);
    });

    // User management (admin only)
    Route::apiResource('users', UserController::class)->middleware('role:admin');

    // Patient Vitals & Allergies
    Route::get('/patients/{patient}/vitals', [PatientVitalController::class, 'index']);
    Route::post('/patients/{patient}/vitals', [PatientVitalController::class, 'storeVital'])
        ->middleware('role:admin,doctor,receptionist');
    Route::post('/patients/{patient}/allergies', [PatientVitalController::class, 'storeAllergy'])
        ->middleware('role:admin,doctor');
    Route::delete('/allergies/{allergy}', [PatientVitalController::class, 'destroyAllergy'])
        ->middleware('role:admin,doctor');

    // Wards & Bed Management Matrix
    Route::get('/wards', [WardBedController::class, 'indexWards']);
    Route::get('/beds', [WardBedController::class, 'indexBeds']);
    Route::put('/beds/{bed}/status', [WardBedController::class, 'updateBedStatus'])
        ->middleware('role:admin,receptionist,doctor');
    Route::post('/beds/{bed}/discharge', [WardBedController::class, 'dischargeBed'])
        ->middleware('role:admin,receptionist,doctor');

    // Laboratory & Diagnostic Investigations
    Route::get('/lab-tests/catalog', [LabOrderController::class, 'catalog']);
    Route::get('/lab-orders', [LabOrderController::class, 'index']);
    Route::post('/lab-orders', [LabOrderController::class, 'store'])
        ->middleware('role:admin,doctor');
    Route::put('/lab-orders/{labOrder}/results', [LabOrderController::class, 'updateResults'])
        ->middleware('role:admin,doctor');

    // Hospital Pharmacy & Formulary
    Route::get('/pharmacy/medicines', [PharmacyController::class, 'index']);
    Route::post('/pharmacy/medicines', [PharmacyController::class, 'store'])
        ->middleware('role:admin');
    Route::post('/pharmacy/dispense', [PharmacyController::class, 'dispense'])
        ->middleware('role:admin,doctor,receptionist');
    Route::get('/pharmacy/dispensations', [PharmacyController::class, 'dispensations']);

    // HMO Health Insurance & Split Billing Claims
    Route::get('/insurance/providers', [InsuranceClaimController::class, 'providers']);
    Route::post('/insurance/policies', [InsuranceClaimController::class, 'storePolicy'])
        ->middleware('role:admin,receptionist');
    Route::get('/insurance/pending-bills', [InsuranceClaimController::class, 'pendingBills']);
    Route::get('/insurance/claims', [InsuranceClaimController::class, 'claims']);
    Route::post('/insurance/claims', [InsuranceClaimController::class, 'storeClaim'])
        ->middleware('role:admin,receptionist');
});

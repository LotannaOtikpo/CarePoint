<?php

use App\Http\Controllers\AppointmentPaymentController;
use App\Http\Controllers\ClinicalDocumentController;
use Illuminate\Support\Facades\Route;

Route::get('/receipts/appointments/{appointment}', [AppointmentPaymentController::class, 'downloadReceipt'])
    ->middleware('signed')
    ->name('receipt.download');

// Clinical PDF Document Generation Routes
Route::prefix('documents')->name('documents.')->group(function () {
    Route::get('/discharge-summary/{admission}', [ClinicalDocumentController::class, 'downloadDischargeSummary'])->name('discharge.pdf');
    Route::get('/prescription-slip/{prescription}', [ClinicalDocumentController::class, 'downloadPrescriptionSlip'])->name('prescription.pdf');
    Route::get('/hospital-invoice/{bill}', [ClinicalDocumentController::class, 'downloadBillInvoice'])->name('invoice.pdf');
});

Route::get('/', fn () => response()->json([
    'app' => 'CarePoint | Apex Health Technologies Hospital API',
    'status' => 'running',
]));

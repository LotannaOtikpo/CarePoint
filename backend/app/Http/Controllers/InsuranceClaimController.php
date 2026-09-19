<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\BillClaim;
use App\Models\InsuranceProvider;
use App\Models\PatientInsurancePolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Class InsuranceClaimController
 */
class InsuranceClaimController extends Controller
{
    /**
     * List active HMO providers
     */
    public function providers(): JsonResponse
    {
        $providers = InsuranceProvider::where('is_active', true)->orderBy('name')->get();
        return response()->json(['providers' => $providers]);
    }

    /**
     * Enroll patient in an HMO / Insurance policy
     */
    public function storePolicy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'insurance_provider_id' => 'required|exists:insurance_providers,id',
            'policy_number' => 'required|string|max:100',
            'tier' => 'nullable|string|max:100',
            'co_pay_percentage' => 'required|numeric|between:0,100',
            'valid_until' => 'nullable|date',
            'is_primary' => 'boolean',
        ]);

        if (!empty($validated['is_primary'])) {
            PatientInsurancePolicy::where('patient_id', $validated['patient_id'])
                ->update(['is_primary' => false]);
        }

        $policy = PatientInsurancePolicy::create($validated);

        return response()->json([
            'message' => 'HMO Policy enrolled successfully for patient.',
            'policy' => $policy->load('provider'),
        ], 201);
    }

    /**
     * Get pending bills ready for insurance claim filing
     */
    public function pendingBills(): JsonResponse
    {
        $bills = Bill::with(['patient.primaryInsurance.provider', 'items'])
            ->whereDoesntHave('claim')
            ->latest()
            ->take(20)
            ->get();

        return response()->json(['bills' => $bills]);
    }

    /**
     * List submitted HMO claims
     */
    public function claims(Request $request): JsonResponse
    {
        $query = BillClaim::with(['bill.patient', 'insurancePolicy.provider']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('claim_status', $request->status);
        }

        $claims = $query->latest('submitted_at')->paginate($request->input('per_page', 15));

        return response()->json($claims);
    }

    /**
     * File a new claim for an inpatient/outpatient bill
     */
    public function storeClaim(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bill_id' => 'required|exists:bills,id|unique:bill_claims,bill_id',
            'pre_authorization_code' => 'nullable|string|max:100',
        ]);

        $bill = Bill::with('patient.primaryInsurance')->findOrFail($validated['bill_id']);

        if (!$bill->patient->primaryInsurance) {
            return response()->json([
                'message' => 'The selected patient does not have an active HMO policy attached.',
            ], 422);
        }

        $policy = $bill->patient->primaryInsurance;
        $total = (float) $bill->total;
        $copayPercent = (float) $policy->co_pay_percentage;
        $copayAmount = round($total * ($copayPercent / 100), 2);
        $claimAmount = round($total - $copayAmount, 2);

        $claim = BillClaim::create([
            'bill_id' => $bill->id,
            'patient_insurance_policy_id' => $policy->id,
            'pre_authorization_code' => $validated['pre_authorization_code'] ?? null,
            'total_bill_amount' => $total,
            'patient_copay_amount' => $copayAmount,
            'insurance_claim_amount' => $claimAmount,
            'claim_status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'HMO claim generated and queued for settlement.',
            'claim' => $claim->load(['bill.patient', 'insurancePolicy.provider']),
        ], 201);
    }
}

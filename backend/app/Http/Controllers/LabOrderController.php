<?php

namespace App\Http\Controllers;

use App\Models\LabOrder;
use App\Models\LabOrderResult;
use App\Models\LabTest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Class LabOrderController
 */
class LabOrderController extends Controller
{
    /**
     * List paginated lab orders
     */
    public function index(Request $request): JsonResponse
    {
        $query = LabOrder::with(['patient', 'doctor.user', 'results.labTest']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', fn ($p) => $p->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
            });
        }

        $orders = $query->latest('ordered_at')->paginate($request->input('per_page', 15));

        return response()->json($orders);
    }

    /**
     * Get active lab test catalog
     */
    public function catalog(): JsonResponse
    {
        $tests = LabTest::where('is_active', true)->orderBy('category')->orderBy('name')->get();
        return response()->json(['tests' => $tests]);
    }

    /**
     * Requisition a new lab order
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'priority' => 'required|in:routine,urgent,stat',
            'clinical_notes' => 'nullable|string',
            'test_ids' => 'required|array|min:1',
            'test_ids.*' => 'exists:lab_tests,id',
        ]);

        $order = LabOrder::create([
            'order_number' => LabOrder::nextOrderNumber(),
            'patient_id' => $validated['patient_id'],
            'doctor_id' => $validated['doctor_id'] ?? null,
            'priority' => $validated['priority'],
            'clinical_notes' => $validated['clinical_notes'] ?? null,
            'status' => 'pending',
            'ordered_at' => now(),
        ]);

        foreach ($validated['test_ids'] as $testId) {
            $test = LabTest::find($testId);
            LabOrderResult::create([
                'lab_order_id' => $order->id,
                'lab_test_id' => $testId,
                'reference_range' => $test?->normal_range,
            ]);
        }

        return response()->json([
            'message' => "Lab order {$order->order_number} created successfully.",
            'order' => $order->load(['patient', 'doctor.user', 'results.labTest']),
        ], 201);
    }

    /**
     * Record results, observations and finalize lab order
     */
    public function updateResults(Request $request, LabOrder $labOrder): JsonResponse
    {
        $validated = $request->validate([
            'results' => 'required|array|min:1',
            'results.*.id' => 'required|exists:lab_order_results,id',
            'results.*.result_value' => 'nullable|string',
            'results.*.is_abnormal' => 'boolean',
            'results.*.findings_summary' => 'nullable|string',
        ]);

        $userId = Auth::id();

        foreach ($validated['results'] as $resData) {
            LabOrderResult::where('id', $resData['id'])
                ->where('lab_order_id', $labOrder->id)
                ->update([
                    'result_value' => $resData['result_value'] ?? null,
                    'is_abnormal' => !empty($resData['is_abnormal']),
                    'findings_summary' => $resData['findings_summary'] ?? null,
                    'verified_by' => $userId,
                    'verified_at' => now(),
                ]);
        }

        $labOrder->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json([
            'message' => "Lab findings for {$labOrder->order_number} recorded and verified.",
            'order' => $labOrder->fresh(['patient', 'doctor.user', 'results.labTest']),
        ]);
    }
}

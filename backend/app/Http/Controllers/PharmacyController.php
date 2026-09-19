<?php

namespace App\Http\Controllers;

use App\Models\Medicine;
use App\Models\MedicineDispensation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Class PharmacyController
 */
class PharmacyController extends Controller
{
    /**
     * List medicines with search, category filtering and inventory stats
     */
    public function index(Request $request): JsonResponse
    {
        $query = Medicine::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('brand_name', 'like', "%{$search}%")
                  ->orWhere('generic_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->boolean('low_stock_only')) {
            $query->whereRaw('stock_quantity <= reorder_level');
        }

        $medicines = $query->orderBy('brand_name')->paginate($request->input('per_page', 15));

        $totalStockValue = Medicine::sum(DB::raw('stock_quantity * selling_price'));
        $lowStockCount = Medicine::whereRaw('stock_quantity <= reorder_level')->count();
        $categories = Medicine::select('category')->distinct()->pluck('category');

        return response()->json([
            'medicines' => $medicines,
            'stats' => [
                'total_stock_value' => (float) $totalStockValue,
                'low_stock_count' => $lowStockCount,
                'categories' => $categories,
            ],
        ]);
    }

    /**
     * Store new medicine in hospital inventory
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'brand_name' => 'required|string|max:255',
            'generic_name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'dosage_form' => 'required|in:tablet,capsule,syrup,injection,inhaler,ointment,drops',
            'strength' => 'nullable|string|max:100',
            'unit_cost' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'reorder_level' => 'required|integer|min:0',
            'batch_number' => 'nullable|string|max:100',
            'expiry_date' => 'nullable|date',
        ]);

        $medicine = Medicine::create($validated);

        return response()->json([
            'message' => "Medication {$medicine->brand_name} registered into pharmacy.",
            'medicine' => $medicine,
        ], 201);
    }

    /**
     * Dispense medicine to a patient
     */
    public function dispense(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'medicine_id' => 'required|exists:medicines,id',
            'patient_id' => 'required|exists:patients,id',
            'quantity' => 'required|integer|min:1',
            'instructions' => 'nullable|string',
        ]);

        $medicine = Medicine::findOrFail($validated['medicine_id']);

        if ($medicine->stock_quantity < $validated['quantity']) {
            return response()->json([
                'message' => "Insufficient stock. Only {$medicine->stock_quantity} units available.",
            ], 422);
        }

        $total = $validated['quantity'] * $medicine->selling_price;

        $dispensation = MedicineDispensation::create([
            'medicine_id' => $medicine->id,
            'patient_id' => $validated['patient_id'],
            'dispensed_by' => Auth::id(),
            'quantity' => $validated['quantity'],
            'unit_price' => $medicine->selling_price,
            'total_amount' => $total,
            'instructions' => $validated['instructions'] ?? null,
            'dispensed_at' => now(),
        ]);

        $medicine->decrement('stock_quantity', $validated['quantity']);

        return response()->json([
            'message' => 'Medication dispensed successfully.',
            'dispensation' => $dispensation->load(['medicine', 'patient']),
            'remaining_stock' => $medicine->fresh()->stock_quantity,
        ], 201);
    }

    /**
     * List recent dispensations log
     */
    public function dispensations(Request $request): JsonResponse
    {
        $dispensations = MedicineDispensation::with(['medicine', 'patient', 'dispenser'])
            ->latest('dispensed_at')
            ->paginate($request->input('per_page', 15));

        return response()->json($dispensations);
    }
}

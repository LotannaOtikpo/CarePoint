<?php

namespace App\Http\Controllers;

use App\Models\Bed;
use App\Models\Ward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Class WardBedController
 */
class WardBedController extends Controller
{
    /**
     * List all wards with bed distribution counts
     */
    public function indexWards(): JsonResponse
    {
        $wards = Ward::withCount([
            'beds',
            'beds as occupied_beds_count' => fn ($q) => $q->where('status', 'occupied'),
            'beds as available_beds_count' => fn ($q) => $q->where('status', 'available'),
            'beds as sanitizing_beds_count' => fn ($q) => $q->where('status', 'sanitizing'),
        ])->get();

        $totalBeds = Bed::count();
        $occupiedBeds = Bed::where('status', 'occupied')->count();
        $availableBeds = Bed::where('status', 'available')->count();
        $sanitizingBeds = Bed::where('status', 'sanitizing')->count();
        $occupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 1) : 0;

        return response()->json([
            'wards' => $wards,
            'stats' => [
                'total_beds' => $totalBeds,
                'occupied_beds' => $occupiedBeds,
                'available_beds' => $availableBeds,
                'sanitizing_beds' => $sanitizingBeds,
                'occupancy_rate' => $occupancyRate,
            ],
        ]);
    }

    /**
     * List beds with filters for ward_id and status
     */
    public function indexBeds(Request $request): JsonResponse
    {
        $query = Bed::with(['ward', 'currentAdmission.patient', 'currentAdmission.doctor.user']);

        if ($request->filled('ward_id')) {
            $query->where('ward_id', $request->ward_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $beds = $query->orderBy('bed_number')->get();

        return response()->json(['beds' => $beds]);
    }

    /**
     * Update bed operational status (e.g. available, sanitizing, maintenance)
     */
    public function updateBedStatus(Request $request, Bed $bed): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:available,sanitizing,maintenance',
        ]);

        if ($validated['status'] === 'available') {
            $bed->markAvailable();
        } elseif ($validated['status'] === 'sanitizing') {
            $bed->markSanitizing();
        } else {
            $bed->update(['status' => 'maintenance']);
        }

        return response()->json([
            'message' => "Bed {$bed->bed_number} status updated to {$validated['status']}.",
            'bed' => $bed->fresh(['ward', 'currentAdmission.patient']),
        ]);
    }

    /**
     * Quick discharge of admitted patient and cycle bed to sanitizing
     */
    public function dischargeBed(Bed $bed): JsonResponse
    {
        $admission = $bed->currentAdmission;

        if ($admission) {
            $admission->update([
                'status' => 'discharged',
                'discharged_at' => now(),
            ]);
        }

        $bed->markSanitizing();

        return response()->json([
            'message' => "Patient successfully discharged. Bed {$bed->bed_number} is now sanitizing.",
            'bed' => $bed->fresh(['ward']),
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\PatientAllergy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Class PatientVitalController
 */
class PatientVitalController extends Controller
{
    /**
     * Get patient vitals history and active allergies
     */
    public function index(Patient $patient): JsonResponse
    {
        $vitals = $patient->vitals()->latest('recorded_at')->take(20)->get();
        $allergies = $patient->allergies()->latest()->get();
        $latest = $vitals->first();

        return response()->json([
            'patient' => [
                'id' => $patient->id,
                'name' => $patient->name,
                'code' => $patient->code,
                'gender' => $patient->gender,
                'dob' => $patient->dob,
                'blood_group' => $patient->blood_group,
            ],
            'latest' => $latest,
            'vitals' => $vitals,
            'allergies' => $allergies,
        ]);
    }

    /**
     * Record new vital signs
     */
    public function storeVital(Request $request, Patient $patient): JsonResponse
    {
        $validated = $request->validate([
            'systolic_bp' => 'nullable|numeric|between:40,300',
            'diastolic_bp' => 'nullable|numeric|between:20,200',
            'heart_rate' => 'nullable|integer|between:30,250',
            'temperature' => 'nullable|numeric|between:30,45',
            'spo2' => 'nullable|numeric|between:50,100',
            'respiratory_rate' => 'nullable|integer|between:5,60',
            'weight_kg' => 'nullable|numeric|between:1,300',
            'height_cm' => 'nullable|numeric|between:30,250',
            'clinical_notes' => 'nullable|string',
            'triage_category' => 'nullable|in:non_urgent,standard,urgent,emergency',
        ]);

        // Auto calculate BMI if height and weight provided
        if (!empty($validated['height_cm']) && !empty($validated['weight_kg']) && $validated['height_cm'] > 0) {
            $heightM = $validated['height_cm'] / 100;
            $validated['bmi'] = round($validated['weight_kg'] / ($heightM * $heightM), 1);
        }

        // Auto determine triage category if not manually forced
        if (empty($validated['triage_category'])) {
            if ((!empty($validated['spo2']) && $validated['spo2'] < 90) ||
                (!empty($validated['systolic_bp']) && ($validated['systolic_bp'] >= 180 || $validated['systolic_bp'] < 80))) {
                $validated['triage_category'] = 'emergency';
            } elseif ((!empty($validated['spo2']) && $validated['spo2'] < 95) ||
                      (!empty($validated['temperature']) && $validated['temperature'] >= 39.0) ||
                      (!empty($validated['heart_rate']) && ($validated['heart_rate'] > 120 || $validated['heart_rate'] < 50))) {
                $validated['triage_category'] = 'urgent';
            } else {
                $validated['triage_category'] = 'standard';
            }
        }

        $validated['recorded_at'] = now();
        $vital = $patient->vitals()->create($validated);

        return response()->json([
            'message' => 'Vitals recorded successfully.',
            'vital' => $vital,
        ], 201);
    }

    /**
     * Record new allergy
     */
    public function storeAllergy(Request $request, Patient $patient): JsonResponse
    {
        $validated = $request->validate([
            'allergen' => 'required|string|max:255',
            'allergy_type' => 'required|in:drug,food,environmental,other',
            'reaction' => 'nullable|string|max:255',
            'severity' => 'required|in:mild,moderate,severe',
        ]);

        $allergy = $patient->allergies()->create($validated);

        return response()->json([
            'message' => 'Allergy added to medical record.',
            'allergy' => $allergy,
        ], 201);
    }

    /**
     * Delete an allergy record
     */
    public function destroyAllergy(PatientAllergy $allergy): JsonResponse
    {
        $allergy->delete();
        return response()->json(['message' => 'Allergy record removed.']);
    }
}

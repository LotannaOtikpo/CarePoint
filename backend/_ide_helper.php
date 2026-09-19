<?php

/** @noinspection ALL */
// @formatter:off
// phpcs:ignoreFile

/**
 * IDE Helper file for CarePoint - Intelephense / PhpStorm Type Definition
 * This file is never executed at runtime and only serves to eliminate
 * "Undefined type" warnings across all models, controllers, and routes in VS Code.
 */

namespace App\Models {
    if (false) {
        /**
         * App\Models\InsuranceProvider
         *
         * @property int $id
         * @property string $name
         * @property string $code
         * @property string|null $contact_person
         * @property string|null $email
         * @property string|null $phone
         * @property float $default_coverage_percentage
         * @property bool $is_active
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\PatientInsurancePolicy[] $policies
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class InsuranceProvider extends \Illuminate\Database\Eloquent\Model {}

        /**
         * App\Models\PatientInsurancePolicy
         *
         * @property int $id
         * @property int $patient_id
         * @property int $insurance_provider_id
         * @property string $policy_number
         * @property string|null $tier
         * @property float $co_pay_percentage
         * @property \Illuminate\Support\Carbon|null $valid_until
         * @property bool $is_primary
         * @property bool $is_active
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \App\Models\Patient $patient
         * @property-read \App\Models\InsuranceProvider $provider
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class PatientInsurancePolicy extends \Illuminate\Database\Eloquent\Model {}

        /**
         * App\Models\BillClaim
         *
         * @property int $id
         * @property int $bill_id
         * @property int $patient_insurance_policy_id
         * @property string|null $pre_authorization_code
         * @property float $total_bill_amount
         * @property float $patient_copay_amount
         * @property float $insurance_claim_amount
         * @property string $claim_status
         * @property string|null $rejection_reason
         * @property \Illuminate\Support\Carbon|null $submitted_at
         * @property \Illuminate\Support\Carbon|null $settled_at
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \App\Models\Bill $bill
         * @property-read \App\Models\PatientInsurancePolicy $insurancePolicy
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class BillClaim extends \Illuminate\Database\Eloquent\Model {}

        /**
         * App\Models\LabOrder
         *
         * @property int $id
         * @property string $order_number
         * @property int $patient_id
         * @property int|null $doctor_id
         * @property string $priority
         * @property string $status
         * @property string|null $clinical_notes
         * @property \Illuminate\Support\Carbon|null $ordered_at
         * @property \Illuminate\Support\Carbon|null $completed_at
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \App\Models\Patient $patient
         * @property-read \App\Models\Doctor|null $doctor
         * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\LabOrderResult[] $results
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class LabOrder extends \Illuminate\Database\Eloquent\Model {
            public static function nextOrderNumber(): string { return ''; }
        }

        /**
         * App\Models\LabTest
         *
         * @property int $id
         * @property string $code
         * @property string $name
         * @property string $category
         * @property float $price
         * @property string|null $sample_type
         * @property string|null $normal_range
         * @property string|null $unit
         * @property int $turnaround_hours
         * @property bool $is_active
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class LabTest extends \Illuminate\Database\Eloquent\Model {}

        /**
         * App\Models\LabOrderResult
         *
         * @property int $id
         * @property int $lab_order_id
         * @property int $lab_test_id
         * @property string|null $result_value
         * @property bool $is_abnormal
         * @property string|null $reference_range
         * @property string|null $findings_summary
         * @property int|null $verified_by
         * @property \Illuminate\Support\Carbon|null $verified_at
         * @property-read \App\Models\LabOrder $labOrder
         * @property-read \App\Models\LabTest $labTest
         * @property-read \App\Models\User|null $verifier
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class LabOrderResult extends \Illuminate\Database\Eloquent\Model {}

        /**
         * App\Models\PatientAllergy
         *
         * @property int $id
         * @property int $patient_id
         * @property string $allergen
         * @property string $allergy_type
         * @property string $severity
         * @property string|null $reaction
         * @property string|null $notes
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \App\Models\Patient $patient
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class PatientAllergy extends \Illuminate\Database\Eloquent\Model {}

        /**
         * App\Models\Medicine
         *
         * @property int $id
         * @property string $brand_name
         * @property string $generic_name
         * @property string $category
         * @property string $dosage_form
         * @property string $strength
         * @property float $unit_cost
         * @property float $selling_price
         * @property int $stock_quantity
         * @property int $reorder_level
         * @property string|null $batch_number
         * @property \Illuminate\Support\Carbon|null $expiry_date
         * @property string|null $manufacturer
         * @property bool $is_active
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class Medicine extends \Illuminate\Database\Eloquent\Model {
            public function isLowStock(): bool { return false; }
        }

        /**
         * App\Models\MedicineDispensation
         *
         * @property int $id
         * @property int|null $prescription_id
         * @property int $medicine_id
         * @property int|null $patient_id
         * @property int|null $dispensed_by
         * @property int $quantity
         * @property float $unit_price
         * @property float $total_amount
         * @property string|null $instructions
         * @property \Illuminate\Support\Carbon|null $dispensed_at
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \App\Models\Medicine $medicine
         * @property-read \App\Models\Patient|null $patient
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class MedicineDispensation extends \Illuminate\Database\Eloquent\Model {}

        /**
         * App\Models\Ward
         *
         * @property int $id
         * @property string $name
         * @property string $code
         * @property string|null $department
         * @property int $floor
         * @property int $capacity
         * @property float $base_daily_rate
         * @property bool $is_active
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\Bed[] $beds
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class Ward extends \Illuminate\Database\Eloquent\Model {
            public function occupiedBedsCount(): int { return 0; }
        }

        /**
         * App\Models\Bed
         *
         * @property int $id
         * @property int $ward_id
         * @property string $bed_number
         * @property string $bed_type
         * @property string $status
         * @property int|null $current_admission_id
         * @property float $daily_rate
         * @property string|null $notes
         * @property \Illuminate\Support\Carbon|null $created_at
         * @property \Illuminate\Support\Carbon|null $updated_at
         * @property-read \App\Models\Ward $ward
         * @mixin \Illuminate\Database\Eloquent\Builder
         * @mixin \Illuminate\Database\Eloquent\Model
         */
        class Bed extends \Illuminate\Database\Eloquent\Model {}
    }
}

namespace App\Http\Controllers {
    use App\Http\Controllers\Controller;

    if (false) {
        /**
         * App\Http\Controllers\ClinicalDocumentController
         */
        class ClinicalDocumentController extends \App\Http\Controllers\Controller {
            public function downloadDischargeSummary(\App\Models\Admission $admission): \Illuminate\Http\Response { return new \Illuminate\Http\Response(); }
            public function downloadPrescriptionSlip(\App\Models\Prescription $prescription): \Illuminate\Http\Response { return new \Illuminate\Http\Response(); }
            public function downloadBillInvoice(\App\Models\Bill $bill): \Illuminate\Http\Response { return new \Illuminate\Http\Response(); }
        }
    }
}

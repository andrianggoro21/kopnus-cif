<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_id', 20)->unique();
            $table->string('full_name', 100);
            $table->string('nik', 16);
            $table->date('dob');
            $table->string('phone', 20)->nullable();
            $table->string('marital_status', 20);
            $table->string('spouse_name', 100)->nullable();
            $table->boolean('spouse_forgotten')->default(false);
            $table->string('loan_type', 20);
            $table->unsignedBigInteger('loan_amount');
            $table->unsignedSmallInteger('loan_tenor_months');
            $table->string('decision', 10);
            $table->string('reason', 20)->nullable();
            $table->double('identity_confidence')->nullable();
            $table->double('credit_score')->nullable();
            $table->string('scoring_error', 50)->nullable();
            $table->string('matched_no_cif', 20)->nullable();
            $table->json('candidates');
            $table->string('status', 20);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};

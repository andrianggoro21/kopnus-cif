<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('application_id', 20);
            $table->foreign('application_id')->references('application_id')->on('applications')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('doc_type', 20);
            $table->string('mime_type', 50);
            $table->unsignedBigInteger('size');
            $table->string('path');
            $table->string('status', 20)->default('COMPLETED');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};

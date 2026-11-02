<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analyst_queue', function (Blueprint $table) {
            $table->id();
            $table->string('application_id', 20)->unique();
            $table->timestamp('queued_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analyst_queue');
    }
};

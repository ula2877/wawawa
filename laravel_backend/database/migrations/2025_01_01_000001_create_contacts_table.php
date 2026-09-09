<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PLN customers. IDPEL and phone are ALWAYS stored as strings.
     * Never store phone numbers as numeric types (avoids scientific notation).
     */
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('idpel', 30)->unique();
            $table->string('name', 150);
            $table->string('phone', 20);
            $table->string('email', 150)->nullable();
            $table->string('customer_type', 50)->nullable();
            $table->string('tariff', 20)->nullable();
            $table->unsignedInteger('power')->nullable();
            $table->string('region', 100)->nullable();
            $table->string('ulp', 100)->nullable();
            $table->dateTime('last_contact_at')->nullable();
            $table->timestamps();

            $table->index('phone');
            $table->index('customer_type');
            $table->index('tariff');
            $table->index('region');
            $table->index('ulp');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
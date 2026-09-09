<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('code', 50)->unique();
            $table->string('category', 100);
            $table->string('language', 50);
            $table->text('content');
            $table->json('variables')->nullable();
            $table->string('status', 30);
            $table->unsignedBigInteger('usage_count')->default(0);
            $table->timestamps();

            $table->index('category');
            $table->index('status');
            $table->index('language');
            $table->index('created_at');
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates');
    }
};

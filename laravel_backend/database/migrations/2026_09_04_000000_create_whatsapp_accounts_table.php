<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique();
            $table->string('phone', 30);
            $table->string('api_url', 500);
            $table->text('api_key')->nullable();
            $table->string('status', 20)->default('disconnected');
            $table->boolean('is_default')->default(false);
            $table->unsignedBigInteger('messages_sent')->default(0);
            $table->decimal('failure_rate', 5, 2)->default(0);
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('is_default');
            $table->index('created_at');
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_accounts');
    }
};

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsAppAccount extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_accounts';

    protected $fillable = [
        'name',
        'phone',
        'api_url',
        'api_key',
        'status',
        'is_default',
        'messages_sent',
        'failure_rate',
        'last_sync_at',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'messages_sent' => 'integer',
        'failure_rate' => 'float',
        'last_sync_at' => 'datetime',
    ];

    public const STATUSES = [
        'connected',
        'disconnected',
        'connecting',
        'error',
    ];

    public const DEFAULT_STATUS = 'disconnected';
}

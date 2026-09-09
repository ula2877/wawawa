<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Contact extends Model
{
    use HasFactory;

    protected $fillable = [
        'idpel',
        'name',
        'phone',
        'email',
        'customer_type',
        'tariff',
        'power',
        'region',
        'ulp',
        'last_contact_at',
    ];

    protected $casts = [
        'power' => 'integer',
        'last_contact_at' => 'datetime',
    ];

    /**
     * A contact can belong to many groups (many-to-many).
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class)->withTimestamps();
    }
}
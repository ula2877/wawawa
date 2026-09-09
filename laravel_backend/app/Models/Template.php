<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'category',
        'language',
        'content',
        'variables',
        'usage_count',
    ];

    protected $casts = [
        'variables' => 'array',
        'usage_count' => 'integer',
    ];
}

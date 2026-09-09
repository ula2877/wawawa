<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('groups', 'name')],
            'slug' => ['nullable', 'string', 'max:120', Rule::unique('groups', 'slug')],
            'description' => ['nullable', 'string'],
        ];
    }
}
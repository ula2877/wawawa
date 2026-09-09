<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'idpel' => ['required', 'string', 'max:30', Rule::unique('contacts', 'idpel')],
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?\d[\d\s-]*$/'],
            'email' => ['nullable', 'email', 'max:150'],
            'customer_type' => ['nullable', 'string', 'max:50'],
            'tariff' => ['nullable', 'string', 'max:20'],
            'power' => ['nullable', 'integer', 'min:0'],
            'region' => ['nullable', 'string', 'max:100'],
            'ulp' => ['nullable', 'string', 'max:100'],
            'last_contact_at' => ['nullable', 'date'],
            'group_ids' => ['nullable', 'array'],
            'group_ids.*' => ['integer', 'exists:groups,id'],
        ];
    }
}
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $contactId = $this->route('contact') instanceof \App\Models\Contact
            ? $this->route('contact')->id
            : $this->route('contact');

        return [
            'idpel' => ['sometimes', 'required', 'string', 'max:30', Rule::unique('contacts', 'idpel')->ignore($contactId)],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'phone' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^\+?\d[\d\s-]*$/'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'customer_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'tariff' => ['sometimes', 'nullable', 'string', 'max:20'],
            'power' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'region' => ['sometimes', 'nullable', 'string', 'max:100'],
            'ulp' => ['sometimes', 'nullable', 'string', 'max:100'],
            'last_contact_at' => ['sometimes', 'nullable', 'date'],
            'group_ids' => ['sometimes', 'array'],
            'group_ids.*' => ['integer', 'exists:groups,id'],
        ];
    }
}
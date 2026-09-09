<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignGroupContactsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contact_ids' => ['required', 'array'],
            'contact_ids.*' => ['integer', 'exists:contacts,id'],
        ];
    }
}
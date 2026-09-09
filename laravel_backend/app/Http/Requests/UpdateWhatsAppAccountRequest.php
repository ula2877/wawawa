<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWhatsAppAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'phone' => ['sometimes', 'required', 'string', 'max:30', 'regex:/^\+?[0-9][0-9\s-]{5,}$/'],
            'api_url' => ['sometimes', 'required', 'string', 'max:500', 'regex:/^https?:\/\/[^\s]+$/i'],
            // Blank api_key is allowed on update: the stored key is kept.
            'api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Never allow the client to set runtime/analytics fields.
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated(null, $default);

        foreach (['status', 'is_default', 'messages_sent', 'failure_rate', 'last_sync_at', 'created_at', 'updated_at'] as $guarded) {
            unset($data[$guarded]);
        }

        return $key === null ? $data : ($data[$key] ?? $default);
    }
}

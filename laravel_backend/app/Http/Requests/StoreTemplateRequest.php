<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:100'],
            'language' => ['required', 'string', 'max:50'],
            'content' => ['required', 'string'],
        ];
    }

    /**
     * Never allow the client to set code, usage_count, variables or timestamps.
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated(null, $default);

        foreach (['code', 'usage_count', 'variables', 'created_at', 'updated_at'] as $guarded) {
            unset($data[$guarded]);
        }

        return $key === null ? $data : ($data[$key] ?? $default);
    }
}

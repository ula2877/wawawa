<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'language' => ['sometimes', 'required', 'string', 'max:50'],
            'content' => ['sometimes', 'required', 'string'],
        ];
    }

    public function validated($key = null, $default = null)
    {
        $data = parent::validated(null, $default);

        foreach (['code', 'usage_count', 'variables', 'created_at', 'updated_at'] as $guarded) {
            unset($data[$guarded]);
        }

        return $key === null ? $data : ($data[$key] ?? $default);
    }
}

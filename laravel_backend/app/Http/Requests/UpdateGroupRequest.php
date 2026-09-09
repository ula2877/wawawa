<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $groupId = $this->route('group') instanceof \App\Models\Group
            ? $this->route('group')->id
            : $this->route('group');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('groups', 'name')->ignore($groupId)],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120', Rule::unique('groups', 'slug')->ignore($groupId)],
            'description' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
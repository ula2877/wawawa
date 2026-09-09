<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WhatsAppAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'api_url' => $this->api_url,
            'status' => $this->status,
            'is_default' => (bool) $this->is_default,
            'messages_sent' => (int) $this->messages_sent,
            'failure_rate' => (float) $this->failure_rate,
            'last_sync_at' => $this->last_sync_at?->format('Y-m-d H:i:s'),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}

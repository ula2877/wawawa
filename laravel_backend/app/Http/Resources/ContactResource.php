<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
{
    /**
     * Transform the contact into an array consumable by the Contacts frontend.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'idpel' => $this->idpel,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'customer_type' => $this->customer_type,
            'tariff' => $this->tariff,
            'power' => $this->power,
            'region' => $this->region,
            'ulp' => $this->ulp,
            'last_contact_at' => $this->last_contact_at?->format('Y-m-d H:i:s'),
            'groups' => GroupResource::collection($this->whenLoaded('groups')),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}
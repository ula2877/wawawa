<?php

namespace App\Services;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class ContactService
{
    /**
     * Allowed sort fields. Never pass arbitrary DB columns from the request.
     */
    private const SORTABLE = [
        'name',
        'idpel',
        'phone',
        'email',
        'customer_type',
        'region',
        'ulp',
        'last_contact_at',
        'created_at',
    ];

    /**
     * Normalize a phone number to a consistent international digit string.
     * Accepts: 08123456789 / +628123456789 / 628123456789 -> 628123456789.
     * Always returns a string; never a numeric type.
     */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        if (! str_starts_with($digits, '62')) {
            return '62'.$digits;
        }

        return $digits;
    }

    /**
     * List contacts with optional search, filters, sorting and pagination.
     */
    public function list(array $params = []): LengthAwarePaginator
    {
        $query = Contact::query()
            ->with('groups')
            ->withCount('groups');

        $this->applySearch($query, $params);
        $this->applyFilters($query, $params);
        $this->applySort($query, $params);

        $perPage = min((int) ($params['per_page'] ?? 10), 100);

        return $query->paginate($perPage)->withQueryString();
    }

    private function applySearch(Builder $query, array $params): void
    {
        $search = trim((string) ($params['search'] ?? ''));

        if ($search === '') {
            return;
        }

        $query->where(function (Builder $q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('idpel', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%");
        });
    }

    private function applyFilters(Builder $query, array $params): void
    {
        foreach (['customer_type', 'tariff', 'region', 'ulp'] as $field) {
            if (! empty($params[$field])) {
                $query->where($field, $params[$field]);
            }
        }

        if (array_key_exists('power', $params) && $params['power'] !== null && $params['power'] !== '') {
            $query->where('power', (int) $params['power']);
        }

        if (! empty($params['group_id'])) {
            $query->whereHas('groups', fn (Builder $q) => $q->where('groups.id', $params['group_id']));
        }
    }

    private function applySort(Builder $query, array $params): void
    {
        $field = $params['sort_by'] ?? 'created_at';
        $direction = strtolower((string) ($params['sort_direction'] ?? 'desc'));

        if (! in_array($field, self::SORTABLE, true)) {
            $field = 'created_at';
        }

        $direction = $direction === 'asc' ? 'asc' : 'desc';

        $query->orderBy($field, $direction);
    }

    public function create(array $data): Contact
    {
        $groupIds = $data['group_ids'] ?? [];

        unset($data['group_ids']);

        return \DB::transaction(function () use ($data, $groupIds) {
            $contact = Contact::create($data);
            $contact->groups()->attach($groupIds);

            return $contact->load('groups')->loadCount('groups');
        });
    }

    public function update(Contact $contact, array $data): Contact
    {
        $groupIds = $data['group_ids'] ?? null;

        unset($data['group_ids']);

        return \DB::transaction(function () use ($contact, $data, $groupIds) {
            $contact->update($data);

            // Synchronize the many-to-many relationship when group_ids provided.
            if ($groupIds !== null) {
                $contact->groups()->sync($groupIds);
            }

            return $contact->fresh()->load('groups')->loadCount('groups');
        });
    }

    public function delete(Contact $contact): void
    {
        \DB::transaction(function () use ($contact) {
            // Pivot records are removed via cascadeOnDelete.
            $contact->delete();
        });
    }
}
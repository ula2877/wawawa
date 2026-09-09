<?php

namespace App\Services;

use App\Models\WhatsAppAccount;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class WhatsAppAccountService
{
    /**
     * Allowed sort fields. Never pass arbitrary DB columns from the request.
     */
    private const SORTABLE = [
        'name',
        'phone',
        'api_url',
        'status',
        'is_default',
        'messages_sent',
        'failure_rate',
        'last_sync_at',
        'created_at',
        'updated_at',
    ];

    public function list(array $params = []): LengthAwarePaginator
    {
        $query = WhatsAppAccount::query();

        $this->applySearch($query, $params);
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
                ->orWhere('phone', 'like', "%{$search}%");
        });
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

    public function create(array $data): WhatsAppAccount
    {
        // Runtime/analytics fields are application-managed.
        $data['status'] = WhatsAppAccount::DEFAULT_STATUS;
        $data['messages_sent'] = 0;
        $data['failure_rate'] = 0;
        $data['last_sync_at'] = null;
        // The first account is promoted to the default sender automatically.
        $data['is_default'] = ! WhatsAppAccount::query()->exists();

        return WhatsAppAccount::create($data);
    }

    public function update(WhatsAppAccount $account, array $data): WhatsAppAccount
    {
        // A blank/null api_key means "keep the existing key".
        if (array_key_exists('api_key', $data) && ($data['api_key'] === null || trim((string) $data['api_key']) === '')) {
            unset($data['api_key']);
        }

        $account->update($data);

        return $account->fresh();
    }

    public function delete(WhatsAppAccount $account): void
    {
        DB::transaction(function () use ($account) {
            $account->delete();
        });
    }

    public function setDefault(WhatsAppAccount $account): void
    {
        DB::transaction(function () use ($account) {
            WhatsAppAccount::query()->where('is_default', true)->update(['is_default' => false]);
            $account->update(['is_default' => true]);
        });
    }

    /**
     * Placeholder connection check.
     *
     * This does NOT reach the external WhatsApp API yet (pending real
     * integration). It only records the check on our side so the account is
     * marked as Connected without any outbound network request.
     *
     * @return array{ok: bool, message: string}
     */
    public function checkConnection(WhatsAppAccount $account): array
    {
        DB::transaction(function () use ($account) {
            $account->update([
                'status' => 'connected',
                'last_sync_at' => DB::raw('now()'),
            ]);
        });

        return [
            'ok' => true,
            'message' => 'WhatsApp API connection is healthy.',
        ];
    }
}

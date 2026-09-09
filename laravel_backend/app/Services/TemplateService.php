<?php

namespace App\Services;

use App\Exceptions\InvalidTemplateVariableException;
use App\Models\Template;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class TemplateService
{
    /**
     * Allowed sort fields. Never pass arbitrary DB columns from the request.
     */
    private const SORTABLE = [
        'name',
        'code',
        'category',
        'language',
        'usage_count',
        'created_at',
        'updated_at',
    ];

    /**
     * The ONLY supported personalization variables. These map directly to the
     * Contact model business fields. System/activity fields (created_at,
     * updated_at, last_contact_at) must never be exposed as variables.
     */
    public const ALLOWED_VARIABLES = [
        'name',
        'idpel',
        'phone',
        'email',
        'customer_type',
        'tariff',
        'power',
        'region',
        'ulp',
        'groups',
    ];

    /**
     * Extract the unique {{variable}} placeholder names from content.
     * Placeholders may contain word characters, underscores and hyphens.
     *
     * @return string[] unique variables in order of first appearance
     */
    public static function extractVariables(string $content): array
    {
        preg_match_all('/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/', $content, $matches);

        $variables = array_map('trim', $matches[1] ?? []);

        return array_values(array_unique($variables));
    }

    /**
     * Validate that every variable used in the content is a known Contact
     * variable. Returns the deduplicated variables in order of first
     * appearance, preserving only allowed variables.
     *
     * @throws InvalidTemplateVariableException
     *
     * @return string[]
     */
    private function validateVariables(string $content): array
    {
        $variables = self::extractVariables($content);

        $unknown = array_values(array_diff($variables, self::ALLOWED_VARIABLES));

        if (! empty($unknown)) {
            throw new InvalidTemplateVariableException($unknown);
        }

        return $variables;
    }

    public function list(array $params = []): LengthAwarePaginator
    {
        $query = Template::query();

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
                ->orWhere('code', 'like', "%{$search}%")
                ->orWhere('content', 'like', "%{$search}%");
        });
    }

    private function applyFilters(Builder $query, array $params): void
    {
        foreach (['category', 'language'] as $field) {
            if (! empty($params[$field])) {
                $query->where($field, $params[$field]);
            }
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

    public function create(array $data): Template
    {
        $data['variables'] = $this->validateVariables($data['content']);
        $data['code'] = $this->generateCode();
        $data['usage_count'] = 0;

        return Template::create($data);
    }

    public function update(Template $template, array $data): Template
    {
        if (array_key_exists('content', $data)) {
            $data['variables'] = $this->validateVariables($data['content']);
        }

        $template->update($data);

        return $template->fresh();
    }

    public function delete(Template $template): void
    {
        $template->delete();
    }

    /**
     * Generate the next available unique code in TPL-### format.
     */
    public function generateCode(): string
    {
        $last = Template::where('code', 'like', 'TPL-%')
            ->orderByDesc('id')
            ->value('code');

        $next = $last ? ((int) substr($last, 4)) + 1 : 1;

        $code = sprintf('TPL-%03d', $next);

        while (Template::where('code', $code)->exists()) {
            $next++;
            $code = sprintf('TPL-%03d', $next);
        }

        return $code;
    }
}

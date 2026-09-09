<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\Group;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ContactImportService
{
    /**
     * Column header aliases accepted when reading the CSV file.
     */
    private const HEADER_ALIASES = [
        'idpel' => ['IDPEL', 'IdPel', 'Id_Pel'],
        'name' => ['Name'],
        'phone' => ['Phone', 'No HP', 'No HP WA'],
        'email' => ['Email', 'E-Mail', 'E_mail'],
        'customer_type' => ['Customer Type', 'Customer_Type', 'Type'],
        'tariff' => ['Tariff'],
        'power' => ['Power', 'Power (VA)', 'Power VA', 'Power_VA'],
        'region' => ['Region'],
        'ulp' => ['ULP'],
        'groups' => ['Groups', 'Group', 'Tags'],
    ];

    private const REQUIRED_HEADERS = ['idpel', 'name', 'phone'];

    /**
     * Whitelist of contact columns that may be written to the contacts table.
     * Any CSV column mapped to a field outside this list is never persisted.
     * Groups are handled separately and are NOT part of this whitelist.
     */
    private const ALLOWED_CONTACT_FIELDS = [
        'idpel', 'name', 'phone', 'email',
        'customer_type', 'tariff', 'power', 'region', 'ulp',
    ];

    /**
     * Maps the frontend mapping option values to backend field keys.
     * 'none' / 'ignore' mean the column must be completely ignored.
     */
    private const FRONTEND_FIELD_MAP = [
        'name' => 'name',
        'idpel' => 'idpel',
        'phone' => 'phone',
        'email' => 'email',
        'customerType' => 'customer_type',
        'tariff' => 'tariff',
        'power' => 'power',
        'region' => 'region',
        'ulp' => 'ulp',
        'groups' => 'groups',
        'none' => null,
        'ignore' => null,
    ];

    /**
     * Import a CSV file of PLN contacts.
     *
     * When a $mapping is provided (a map of CSV header name => frontend mapping
     * option, e.g. 'none' for Ignore), it is used to decide exactly which
     * columns are imported. Columns mapped to 'none'/'ignore' are omitted.
     * Columns mapped to 'groups' are parsed and attached as group relationships.
     *
     * Returns an import summary:
     * [
     *   'message' => string,
     *   'total_rows' => int,
     *   'created' => int,
     *   'skipped' => int,
     *   'failed' => int,
     *   'groups_created' => int,
     *   'errors' => [ ['row'=>int,'field'=>string,'message'=>string], ... ],
     *   'duplicates' => [ ['row'=>int,'idpel'=>string,'status'=>'skipped','reason'=>string], ... ]
     * ]
     */
    public function import(UploadedFile $file, ?array $mapping = null): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            return [
                'message' => 'Could not open CSV file',
                'total_rows' => 0,
                'created' => 0,
                'skipped' => 0,
                'failed' => 0,
                'groups_created' => 0,
                'errors' => [['row' => 0, 'field' => 'file', 'message' => 'Could not open CSV file']],
                'duplicates' => [],
            ];
        }

        $header = fgetcsv($handle, 0, ',');
        if ($header === false) {
            fclose($handle);

            return $this->invalidFormat(['IDPEL', 'Name', 'Phone']);
        }

        $columns = ! empty($mapping)
            ? $this->columnsFromMapping($header, $mapping)
            : $this->mapHeaders($header);

        $missing = $this->missingRequired($columns);

        if (! empty($missing)) {
            fclose($handle);

            return $this->invalidFormat($missing);
        }

        try {
            return DB::transaction(function () use ($handle, $columns) {
                return $this->processRows($handle, $columns);
            });
        } finally {
            fclose($handle);
        }
    }

    private function processRows($handle, array $columns): array
    {
        $summary = [
            'message' => 'CSV import completed',
            'total_rows' => 0,
            'created' => 0,
            'skipped' => 0,
            'failed' => 0,
            'groups_created' => 0,
            'errors' => [],
            'duplicates' => [],
        ];

        $existingIdpels = $this->existingValueSet('idpel');
        $existingPhones = $this->existingValueSet('phone');

        // Cache resolved group names (lowercased) to their id to avoid re-querying.
        // Also caches groups created during this import so duplicates within the
        // file resolve to the same group record.
        $groupCache = [];

        // Total number of groups created across the whole import.
        $groupsCreated = 0;

        $rowNumber = 1; // header is row 1; data starts at row 2
        $seenIdpelsInFile = [];
        $seenPhonesInFile = [];

        while (($row = fgetcsv($handle, 0, ',')) !== false) {
            $rowNumber++;

            if ($this->isEmptyRow($row)) {
                continue;
            }

            $summary['total_rows']++;

            $contactData = $this->extractRow($row, $columns);

            $idpel = trim((string) $contactData['idpel']);
            $name = trim((string) $contactData['name']);
            $phoneRaw = trim((string) $contactData['phone']);
            $phone = ContactService::normalizePhone($phoneRaw);

            // --- Validation -------------------------------------------------
            $errors = $this->validateRow($contactData, $idpel, $name, $phoneRaw, $phone);

            if (! empty($errors)) {
                foreach ($errors as $error) {
                    $summary['errors'][] = [
                        'row' => $rowNumber,
                        'field' => $error['field'],
                        'message' => $error['message'],
                    ];
                }
                $summary['failed']++;
                continue;
            }

            // --- Duplicate detection ---------------------------------------
            if (isset($seenIdpelsInFile[$idpel]) || isset($existingIdpels[$idpel])) {
                $summary['duplicates'][] = [
                    'row' => $rowNumber,
                    'idpel' => $idpel,
                    'status' => 'skipped',
                    'reason' => 'IDPEL already exists',
                ];
                $summary['skipped']++;
                continue;
            }

            if (isset($seenPhonesInFile[$phone]) || isset($existingPhones[$phone])) {
                $summary['duplicates'][] = [
                    'row' => $rowNumber,
                    'idpel' => $idpel,
                    'status' => 'skipped',
                    'reason' => 'Phone already exists',
                ];
                $summary['skipped']++;
                continue;
            }

            // --- Create contact + attach groups -----------------------------
            $contact = Contact::create([
                'idpel' => $idpel,
                'name' => $name,
                'phone' => $phone,
                'email' => $this->nullable($contactData['email']),
                'customer_type' => $this->nullable($contactData['customer_type']),
                'tariff' => $this->nullable($contactData['tariff']),
                'power' => $this->nullablePower($contactData['power']),
                'region' => $this->nullable($contactData['region']),
                'ulp' => $this->nullable($contactData['ulp']),
            ]);

            $groupIds = $this->resolveGroupIds($contactData['groups'], $groupCache, $groupsCreated);
            if (! empty($groupIds)) {
                $contact->groups()->attach($groupIds);
            }

            $seenIdpelsInFile[$idpel] = true;
            $seenPhonesInFile[$phone] = true;
            $existingIdpels[$idpel] = true;
            $existingPhones[$phone] = true;
            $summary['created']++;
        }

        $summary['groups_created'] = $groupsCreated;

        return $summary;
    }

    private function validateRow(array $data, string $idpel, string $name, string $phoneRaw, string $phone): array
    {
        $errors = [];

        if ($idpel === '') {
            $errors[] = ['field' => 'IDPEL', 'message' => 'IDPEL is required'];
        } elseif (strlen($idpel) > 30) {
            $errors[] = ['field' => 'IDPEL', 'message' => 'IDPEL must not exceed 30 characters'];
        }

        if ($name === '') {
            $errors[] = ['field' => 'Name', 'message' => 'Name is required'];
        } elseif (strlen($name) > 150) {
            $errors[] = ['field' => 'Name', 'message' => 'Name must not exceed 150 characters'];
        }

        if (trim($phoneRaw) === '') {
            $errors[] = ['field' => 'Phone', 'message' => 'Phone is required'];
        } elseif ($phone === '' || ! preg_match('/^\d{7,15}$/', $phone)) {
            $errors[] = ['field' => 'Phone', 'message' => 'Invalid phone number'];
        }

        $email = trim((string) $data['email']);
        if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = ['field' => 'Email', 'message' => 'Invalid email address'];
        }

        return $errors;
    }

    private function mapHeaders(array $header): array
    {
        $columns = [];

        foreach ($header as $index => $cell) {
            $raw = strtolower(trim((string) $cell));
            $normalized = preg_replace('/[^a-z0-9]/i', '', $raw) ?? $raw;

            foreach (self::HEADER_ALIASES as $key => $aliases) {
                foreach ($aliases as $alias) {
                    $aliasNormalized = preg_replace('/[^a-z0-9]/i', '', strtolower($alias)) ?? '';
                    if ($normalized === $aliasNormalized) {
                        $columns[$index] = $key;
                        break 2;
                    }
                }
            }
        }

        return $columns;
    }

    /**
     * Build the column index => backend field map from a frontend-supplied
     * mapping (CSV header name => frontend option). Columns mapped to
     * 'none'/'ignore' are skipped entirely.Headers not mentioned in the
     * mapping fall back to auto-detection so partial mappings (or older
     * clients) still work. Fields are validated against the allowed
     * whitelist; anything unexpected is ignored.
     */
    private function columnsFromMapping(array $header, array $mapping): array
    {
        $columns = [];
        $auto = $this->mapHeaders($header);

        foreach ($header as $index => $cell) {
            $rawHeader = trim((string) $cell);

            // A header explicitly present in the mapping is authoritative.
            if (array_key_exists($rawHeader, $mapping)) {
                $option = $mapping[$rawHeader];

                if ($option === '' || $option === 'none' || $option === 'ignore') {
                    continue;
                }

                $field = self::FRONTEND_FIELD_MAP[$option] ?? null;

                if ($field === null) {
                    continue;
                }

                // Groups are handled separately (parsed into group
                // relationships), so they are stored under the 'groups' key
                // rather than as a contact column.
                if ($field === 'groups') {
                    $columns[$index] = 'groups';
                    continue;
                }

                if (in_array($field, self::ALLOWED_CONTACT_FIELDS, true)) {
                    $columns[$index] = $field;
                }

                continue;
            }

            // Otherwise fall back to auto-detected mapping.
            if (isset($auto[$index])) {
                $columns[$index] = $auto[$index];
            }
        }

        return $columns;
    }

    private function missingRequired(array $columns): array
    {
        $present = array_values($columns);
        $missing = array_diff(self::REQUIRED_HEADERS, $present);

        $labels = [
            'idpel' => 'IDPEL',
            'name' => 'Name',
            'phone' => 'Phone',
        ];

        return array_values(array_map(fn ($key) => $labels[$key], $missing));
    }

    private function invalidFormat(array $missing): array
    {
        return [
            'message' => 'Invalid CSV format',
            'missing_columns' => $missing,
            'total_rows' => 0,
            'created' => 0,
            'skipped' => 0,
            'failed' => 0,
            'groups_created' => 0,
            'errors' => [],
            'duplicates' => [],
        ];
    }

    private function extractRow(array $row, array $columns): array
    {
        $data = [
            'idpel' => '',
            'name' => '',
            'phone' => '',
            'email' => '',
            'customer_type' => '',
            'tariff' => '',
            'power' => '',
            'region' => '',
            'ulp' => '',
            'groups' => '',
        ];

        foreach ($columns as $index => $key) {
            if (array_key_exists($key, $data)) {
                $data[$key] = $row[$index] ?? '';
            }
        }

        return $data;
    }

    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    private function existingValueSet(string $column): array
    {
        return Contact::query()->pluck($column)
            ->map(fn ($v) => (string) $v)
            ->unique()
            ->mapWithKeys(fn ($v) => [$v => true])
            ->all();
    }

    private function nullable(string $value): ?string
    {
        $value = trim($value);
        return $value === '' ? null : $value;
    }

    private function nullablePower(string $value): ?int
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    /**
     * Split the Groups column value on '|' (pipe), trim, drop empties, and
     * resolve (creating if needed) the corresponding group ids. Matching is
     * case-insensitive and duplicate group names within a single value are
     * reduced to a single assignable id. Preserves the canonical group name
     * for existing groups. The number of newly created groups is written to
     * &$groupsCreated.
     */
    private function resolveGroupIds(string $groupsColumn, array &$groupCache, int &$groupsCreated): array
    {
        $names = $this->parseGroupNames($groupsColumn);

        if (empty($names)) {
            return [];
        }

        $ids = [];
        $seen = [];
        $toCreate = [];

        foreach ($names as $name) {
            $normalized = $this->normalizeGroupKey($name);

            if (isset($seen[$normalized])) {
                continue;
            }

            $seen[$normalized] = true;

            if (isset($groupCache[$normalized])) {
                $ids[] = $groupCache[$normalized];
                continue;
            }

            // Find an existing group by its lowercased slug (case-insensitive,
            // works regardless of the database collation for the unique name).
            $group = Group::query()->where('slug', $normalized)->first();

            if ($group) {
                $groupCache[$normalized] = $group->id;
                $ids[] = $group->id;
                continue;
            }

            $toCreate[] = ['name' => $name, 'slug' => $normalized];
        }

        foreach ($toCreate as $candidate) {
            $slug = $candidate['slug'];

            // Re-check after potential creation to avoid races / duplicates.
            $group = Group::query()->where('slug', $slug)->first();

            if (! $group) {
                $group = Group::create([
                    'name' => $candidate['name'],
                    'slug' => $slug,
                    'description' => null,
                ]);
                $groupsCreated++;
            }

            $groupCache[$slug] = $group->id;
            $ids[] = $group->id;
        }

        return array_values(array_unique($ids));
    }

    /**
     * Split the Groups column value on '|' (pipe). Trim whitespace and drop
     * empty segments.
     */
    private function parseGroupNames(string $groupsColumn): array
    {
        $raw = array_map(
            fn ($part) => trim($part),
            explode('|', (string) $groupsColumn)
        );

        return array_values(array_filter($raw, fn ($part) => $part !== ''));
    }

    /**
     * Normalize a group name for case-insensitive lookup and deduplication.
     */
    private function normalizeGroupKey(string $name): string
    {
        return strtolower(str_replace(' ', '-', trim(Str::slug($name))));
    }
}
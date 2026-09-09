<?php

namespace Tests\Feature;

use App\Models\Template;
use App\Models\User;
use App\Services\TemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesUser;
use Tests\TestCase;

class TemplateTest extends TestCase
{
    use RefreshDatabase;
    use AuthenticatesUser;

    private function authHeaders(bool $superadmin = false): array
    {
        $user = User::factory()->create([
            'role' => $superadmin ? 'superadmin' : 'admin',
        ]);

        return $this->apiHeader($user);
    }

    public function test_unauthenticated_cannot_list_templates(): void
    {
        $this->getJson('/api/templates')->assertStatus(401);
    }

    public function test_list_templates_returns_paginated_structure(): void
    {
        Template::factory()->count(5)->create();

        $this->getJson('/api/templates', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'code', 'category', 'language', 'content', 'variables', 'usage_count', 'created_at'],
                ],
                'meta' => ['current_page', 'last_page', 'total', 'per_page'],
            ])
            ->assertJsonCount(5, 'data')
            ->assertJsonMissingPath('data.0.status');
    }

    public function test_list_templates_pagination_defaults_to_10(): void
    {
        $this->getJson('/api/templates', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('meta.per_page', 10);
    }

    public function test_list_templates_pagination_per_page(): void
    {
        Template::factory()->count(12)->create();

        $this->getJson('/api/templates?per_page=5', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.total', 12);
    }

    public function test_list_templates_per_page_capped_at_100(): void
    {
        $this->getJson('/api/templates?per_page=500', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_search_filters_by_name(): void
    {
        Template::factory()->create(['name' => 'Informasi Pemadaman', 'code' => 'TPL-100']);
        Template::factory()->count(3)->create(['name' => 'Layanan Umum', 'content' => 'Selamat datang di layanan kami, {{name}}.']);

        $this->getJson('/api/templates?search=Pemadaman', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Informasi Pemadaman');
    }

    public function test_search_matches_code_and_content(): void
    {
        Template::factory()->create(['code' => 'TPL-777', 'content' => 'Informasi pemadaman di wilayah {{region}}.', 'name' => 'Pemadaman']);
        Template::factory()->count(2)->create(['name' => 'Layanan Umum', 'content' => 'Informasi umum layanan pelanggan {{name}}.']);

        $this->getJson('/api/templates?search=TPL-777', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'TPL-777');

        $this->getJson('/api/templates?search=pemadaman', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'TPL-777');
    }

    public function test_filter_by_category_and_language(): void
    {
        Template::factory()->create([
            'category' => 'Reminder',
            'language' => 'id',
            'name' => 'Pengingat',
            'code' => 'TPL-101',
        ]);
        Template::factory()->create([
            'category' => 'Marketing',
            'language' => 'en',
            'name' => 'Promo',
            'code' => 'TPL-102',
        ]);
        Template::factory()->create([
            'category' => 'Reminder',
            'language' => 'en',
            'name' => 'Pengingat EN',
            'code' => 'TPL-103',
        ]);

        $this->getJson('/api/templates?category=Reminder', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/templates?language=en', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_combined_filters(): void
    {
        Template::factory()->create(['category' => 'Reminder', 'language' => 'id', 'name' => 'A', 'code' => 'TPL-111']);
        Template::factory()->create(['category' => 'Marketing', 'language' => 'id', 'name' => 'B', 'code' => 'TPL-222']);

        $this->getJson('/api/templates?category=Reminder&language=id', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'TPL-111');
    }

    public function test_sorting_asc_and_desc(): void
    {
        Template::factory()->create(['name' => 'Alpha', 'code' => 'TPL-001']);
        Template::factory()->create(['name' => 'Bravo', 'code' => 'TPL-002']);
        Template::factory()->create(['name' => 'Charlie', 'code' => 'TPL-003']);

        $this->getJson('/api/templates?sort_by=name&sort_direction=asc', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Alpha')
            ->assertJsonPath('data.2.name', 'Charlie');

        $this->getJson('/api/templates?sort_by=usage_count&sort_direction=desc', $this->authHeaders())
            ->assertStatus(200);

        $this->getJson('/api/templates?sort_by=category&sort_direction=asc', $this->authHeaders())
            ->assertStatus(200);
    }

    public function test_invalid_sort_field_is_ignored(): void
    {
        Template::factory()->create(['name' => 'Alpha']);

        $this->getJson('/api/templates?sort_by=crazycolumn', $this->authHeaders())
            ->assertStatus(200);
    }

    public function test_create_template_generates_code_usage_and_variables(): void
    {
        $response = $this->postJson('/api/templates', [
            'name' => 'Informasi Pemadaman',
            'category' => 'Informational',
            'language' => 'id',
            'content' => 'Halo {{name}}, pemadaman di wilayah {{region}}, ULP {{ulp}}.',
        ], $this->authHeaders());

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Informasi Pemadaman')
            ->assertJsonPath('data.code', 'TPL-001')
            ->assertJsonPath('data.usage_count', 0)
            ->assertJsonMissingPath('data.status')
            ->assertJsonPath('data.variables', ['name', 'region', 'ulp']);
    }

    public function test_create_template_extracts_unique_variables_in_order(): void
    {
        $response = $this->postJson('/api/templates', [
            'name' => 'Dedupe',
            'category' => 'Utility',
            'language' => 'id',
            'content' => '{{name}} dan lagi {{name}} lalu {{region}} dan {{phone}} dan {{phone}}.',
        ], $this->authHeaders());

        $response->assertStatus(201)
            ->assertJsonPath('data.variables', ['name', 'region', 'phone']);
    }

    public function test_groups_variable_is_supported(): void
    {
        $response = $this->postJson('/api/templates', [
            'name' => 'Grup',
            'category' => 'Informational',
            'language' => 'id',
            'content' => 'Anda terdaftar dalam kelompok {{groups}}.',
        ], $this->authHeaders());

        $response->assertStatus(201)
            ->assertJsonPath('data.variables', ['groups']);
    }

    public function test_create_template_ignores_client_supplied_code_and_usage_count(): void
    {
        $response = $this->postJson('/api/templates', [
            'name' => 'Ignore',
            'category' => 'Marketing',
            'language' => 'id',
            'content' => 'Promo untuk {{name}}.',
            'code' => 'HACK-999',
            'usage_count' => 99,
            'variables' => ['injected'],
        ], $this->authHeaders());

        $response->assertStatus(201)
            ->assertJsonPath('data.code', 'TPL-001')
            ->assertJsonPath('data.usage_count', 0)
            ->assertJsonPath('data.variables', ['name']);
    }

    public function test_create_template_generates_sequential_codes(): void
    {
        $this->postJson('/api/templates', [
            'name' => 'First',
            'category' => 'Utility',
            'language' => 'id',
            'content' => 'A {{name}}',
        ], $this->authHeaders())->assertJsonPath('data.code', 'TPL-001');

        $this->postJson('/api/templates', [
            'name' => 'Second',
            'category' => 'Utility',
            'language' => 'id',
            'content' => 'B {{name}}',
        ], $this->authHeaders())->assertJsonPath('data.code', 'TPL-002');
    }

    public function test_create_template_validation_errors(): void
    {
        $this->postJson('/api/templates', [
            'name' => '',
            'category' => '',
            'language' => '',
            'content' => '',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'category', 'language', 'content']);
    }

    public function test_create_template_rejects_invalid_variable(): void
    {
        $this->postJson('/api/templates', [
            'name' => 'Invalid',
            'category' => 'Utility',
            'language' => 'id',
            'content' => 'Hello {{unknown_variable}}',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid template variable')
            ->assertJsonPath('errors.content.0', 'Unknown template variable: {{unknown_variable}}');
    }

    public function test_create_template_rejects_multiple_invalid_variables(): void
    {
        $this->postJson('/api/templates', [
            'name' => 'Invalid',
            'category' => 'Utility',
            'language' => 'id',
            'content' => 'Amount {{amount}} and due {{due_date}} and {{customer_name}}',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid template variable')
            ->assertJsonCount(3, 'errors.content');
    }

    public function test_create_template_rejects_system_variables(): void
    {
        $this->postJson('/api/templates', [
            'name' => 'System',
            'category' => 'Utility',
            'language' => 'id',
            'content' => 'Created {{created_at}} on {{last_contact_at}}',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid template variable');
    }

    public function test_view_single_template(): void
    {
        $template = Template::factory()->create(['code' => 'TPL-500', 'name' => 'Detail']);

        $this->getJson("/api/templates/{$template->id}", $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'Detail')
            ->assertJsonPath('data.code', 'TPL-500')
            ->assertJsonMissingPath('data.status');
    }

    public function test_view_missing_template_returns_404(): void
    {
        $this->getJson('/api/templates/99999', $this->authHeaders())->assertStatus(404);
    }

    public function test_update_template_recomputes_variables_from_content(): void
    {
        $template = Template::factory()->create([
            'code' => 'TPL-600',
            'content' => 'Halo {{name}}, wilayah {{region}}.',
        ]);

        $this->putJson("/api/templates/{$template->id}", [
            'content' => 'Halo {{name}} dan {{ulp}}.',
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.content', 'Halo {{name}} dan {{ulp}}.')
            ->assertJsonPath('data.variables', ['name', 'ulp'])
            ->assertJsonPath('data.code', 'TPL-600');
    }

    public function test_update_template_partial_fields(): void
    {
        $template = Template::factory()->create([
            'code' => 'TPL-700',
            'name' => 'Before',
            'category' => 'Marketing',
        ]);

        $this->putJson("/api/templates/{$template->id}", [
            'name' => 'After',
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'After')
            ->assertJsonPath('data.category', 'Marketing');
    }

    public function test_update_template_cannot_change_code_or_usage_count(): void
    {
        $template = Template::factory()->create(['code' => 'TPL-800', 'usage_count' => 7]);

        $this->putJson("/api/templates/{$template->id}", [
            'code' => 'CHANGED-99',
            'usage_count' => 123,
            'name' => 'Kept name',
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.code', 'TPL-800')
            ->assertJsonPath('data.usage_count', 7)
            ->assertJsonPath('data.name', 'Kept name');
    }

    public function test_update_template_rejects_invalid_variable(): void
    {
        $template = Template::factory()->create(['code' => 'TPL-810', 'content' => 'Halo {{name}}']);

        $this->putJson("/api/templates/{$template->id}", [
            'content' => 'Halo {{amount}}',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid template variable')
            ->assertJsonPath('errors.content.0', 'Unknown template variable: {{amount}}');
    }

    public function test_delete_template(): void
    {
        $template = Template::factory()->create(['code' => 'TPL-900']);

        $this->deleteJson("/api/templates/{$template->id}", [], $this->authHeaders())
            ->assertStatus(204);

        $this->assertDatabaseMissing('templates', ['id' => $template->id]);
    }

    public function test_meta_returns_categories_languages_and_variables(): void
    {
        $this->getJson('/api/templates/meta', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(count(config('template.categories')), 'categories')
            ->assertJsonCount(count(config('template.languages')), 'languages')
            ->assertJsonPath('variables', TemplateService::ALLOWED_VARIABLES);
    }
}

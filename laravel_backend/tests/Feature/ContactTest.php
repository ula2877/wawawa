<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Group;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesUser;
use Tests\TestCase;

class ContactTest extends TestCase
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

    public function test_unauthenticated_cannot_list_contacts(): void
    {
        $this->getJson('/api/contacts')->assertStatus(401);
    }

    public function test_list_contacts_returns_paginated_structure(): void
    {
        $this->seed(\Database\Seeders\GroupSeeder::class);
        Contact::factory()->count(5)->create();

        $this->getJson('/api/contacts', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'idpel', 'name', 'phone', 'email', 'customer_type', 'tariff', 'power', 'region', 'ulp', 'groups', 'created_at'],
                ],
                'meta' => ['current_page', 'last_page', 'total', 'per_page'],
            ])
            ->assertJsonCount(5, 'data');
    }

    public function test_list_contacts_pagination_per_page(): void
    {
        Contact::factory()->count(10)->create();

        $this->getJson('/api/contacts?per_page=3', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('meta.per_page', 3)
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.total', 10);
    }

    public function test_list_contacts_per_page_capped_at_100(): void
    {
        $this->getJson('/api/contacts?per_page=500', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_search_filters_by_name(): void
    {
        Contact::factory()->create(['name' => 'Budi Santoso']);
        Contact::factory()->count(3)->create(['name' => 'Someone Else']);

        $this->getJson('/api/contacts?search=budi', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Budi Santoso');
    }

    public function test_search_matches_idpel_and_phone_and_email(): void
    {
        Contact::factory()->create(['idpel' => '123456789012']);
        Contact::factory()->create(['phone' => '628123456789']);
        Contact::factory()->create(['email' => 'findme@example.com']);

        $this->getJson('/api/contacts?search=123456789012', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.idpel', '123456789012');

        $this->getJson('/api/contacts?search=628123456789', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.phone', '628123456789');

        $this->getJson('/api/contacts?search=findme', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_filter_by_region_tariff_and_group(): void
    {
        $group = Group::factory()->create();
        $contact = Contact::factory()->create([
            'region' => 'Jakarta',
            'tariff' => 'R1',
            'customer_type' => 'Residential',
        ]);
        $contact->groups()->attach($group->id);

        Contact::factory()->count(3)->create([
            'region' => 'Surabaya',
            'tariff' => 'B2',
            'customer_type' => 'Business',
        ]);

        $this->getJson('/api/contacts?region=Jakarta', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.region', 'Jakarta');

        $this->getJson('/api/contacts?tariff=R1', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/contacts?group_id={$group->id}", $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $contact->id);
    }

    public function test_filter_by_customer_type_and_ulp_and_power(): void
    {
        Contact::factory()->create([
            'customer_type' => 'Business',
            'ulp' => 'Manyar',
            'power' => 1300,
            'region' => 'Surabaya',
        ]);
        Contact::factory()->count(3)->create([
            'customer_type' => 'Residential',
            'power' => 900,
            'ulp' => 'Kebayoran',
            'region' => 'Jakarta',
        ]);

        $this->getJson('/api/contacts?customer_type=Business', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/contacts?ulp=Manyar', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/contacts?power=900', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_combined_filters(): void
    {
        Contact::factory()->create(['region' => 'Jakarta', 'tariff' => 'R1']);
        Contact::factory()->create(['region' => 'Jakarta', 'tariff' => 'B1']);
        Contact::factory()->create(['region' => 'Surabaya', 'tariff' => 'R1']);

        $this->getJson('/api/contacts?region=Jakarta&tariff=R1', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_sorting_asc_and_desc(): void
    {
        Contact::factory()->create(['name' => 'Alpha']);
        Contact::factory()->create(['name' => 'Bravo']);
        Contact::factory()->create(['name' => 'Charlie']);

        $this->getJson('/api/contacts?sort_by=name&sort_direction=asc', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Alpha')
            ->assertJsonPath('data.2.name', 'Charlie');

        $this->getJson('/api/contacts?sort_by=name&sort_direction=desc', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Charlie');
    }

    public function test_invalid_sort_field_is_ignored(): void
    {
        Contact::factory()->create(['name' => 'Alpha']);

        $this->getJson('/api/contacts?sort_by=crazycolumn', $this->authHeaders())
            ->assertStatus(200);
    }

    public function test_create_contact_with_groups(): void
    {
        $groupA = Group::factory()->create(['name' => 'Customers']);
        $groupB = Group::factory()->create(['name' => 'Jakarta']);

        $response = $this->postJson('/api/contacts', [
            'idpel' => '123456789012',
            'name' => 'Budi Santoso',
            'phone' => '628123456789',
            'email' => 'budi@example.com',
            'customer_type' => 'Residential',
            'tariff' => 'R1',
            'power' => 900,
            'region' => 'Jakarta',
            'ulp' => 'Kebayoran',
            'group_ids' => [$groupA->id, $groupB->id],
        ], $this->authHeaders());

        $response->assertStatus(201)
            ->assertJsonPath('data.idpel', '123456789012')
            ->assertJsonPath('data.phone', '628123456789')
            ->assertJsonCount(2, 'data.groups');

        $this->assertDatabaseHas('contact_group', ['contact_id' => $response->json('data.id'), 'group_id' => $groupA->id]);
        $this->assertDatabaseHas('contact_group', ['contact_id' => $response->json('data.id'), 'group_id' => $groupB->id]);
    }

    public function test_create_contact_validation_errors(): void
    {
        $this->postJson('/api/contacts', [
            'idpel' => '',
            'name' => '',
            'phone' => '',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['idpel', 'name', 'phone']);
    }

    public function test_create_contact_rejects_duplicate_idpel(): void
    {
        Contact::factory()->create(['idpel' => '123456789012']);

        $this->postJson('/api/contacts', [
            'idpel' => '123456789012',
            'name' => 'Someone',
            'phone' => '628111111111',
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['idpel']);
    }

    public function test_create_contact_rejects_invalid_group_id(): void
    {
        $this->postJson('/api/contacts', [
            'idpel' => '123456789012',
            'name' => 'Budi',
            'phone' => '628123456789',
            'group_ids' => [9999],
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['group_ids.0']);
    }

    public function test_view_single_contact(): void
    {
        $contact = Contact::factory()->create(['name' => 'Budi Santoso']);
        $group = Group::factory()->create();
        $contact->groups()->attach($group->id);

        $this->getJson("/api/contacts/{$contact->id}", $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'Budi Santoso')
            ->assertJsonCount(1, 'data.groups');
    }

    public function test_view_missing_contact_returns_404(): void
    {
        $this->getJson('/api/contacts/99999', $this->authHeaders())->assertStatus(404);
    }

    public function test_update_contact_syncs_groups(): void
    {
        $contact = Contact::factory()->create(['name' => 'Old Name']);
        $groupA = Group::factory()->create();
        $groupB = Group::factory()->create();
        $contact->groups()->attach($groupA->id);

        $this->putJson("/api/contacts/{$contact->id}", [
            'name' => 'New Name',
            'group_ids' => [$groupB->id],
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonCount(1, 'data.groups')
            ->assertJsonPath('data.groups.0.id', $groupB->id);

        $this->assertDatabaseMissing('contact_group', ['contact_id' => $contact->id, 'group_id' => $groupA->id]);
        $this->assertDatabaseHas('contact_group', ['contact_id' => $contact->id, 'group_id' => $groupB->id]);
    }

    public function test_update_contact_patch_partial_fields(): void
    {
        $contact = Contact::factory()->create(['region' => 'Jakarta', 'tariff' => 'R1']);

        $this->patchJson("/api/contacts/{$contact->id}", [
            'region' => 'Surabaya',
            'name' => $contact->name,
            'idpel' => $contact->idpel,
            'phone' => $contact->phone,
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.region', 'Surabaya')
            ->assertJsonPath('data.tariff', 'R1');
    }

    public function test_update_contact_rejects_duplicate_idpel_of_another_contact(): void
    {
        $first = Contact::factory()->create();
        $second = Contact::factory()->create();

        $this->putJson("/api/contacts/{$second->id}", [
            'idpel' => $first->idpel,
        ], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['idpel']);
    }

    public function test_update_allows_keeping_own_idpel(): void
    {
        $contact = Contact::factory()->create();

        $this->putJson("/api/contacts/{$contact->id}", [
            'idpel' => $contact->idpel,
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.idpel', $contact->idpel);
    }

    public function test_delete_contact_removes_pivot_records(): void
    {
        $contact = Contact::factory()->create();
        $group = Group::factory()->create();
        $contact->groups()->attach($group->id);

        $this->deleteJson("/api/contacts/{$contact->id}", [], $this->authHeaders())
            ->assertStatus(204);

        $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
        $this->assertDatabaseMissing('contact_group', ['contact_id' => $contact->id, 'group_id' => $group->id]);
    }

    public function test_contact_belongs_to_multiple_groups(): void
    {
        $contact = Contact::factory()->create();
        $groups = Group::factory()->count(3)->create();
        $contact->groups()->attach($groups->pluck('id'));

        $this->getJson("/api/contacts/{$contact->id}", $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(3, 'data.groups');
    }
}
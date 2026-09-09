<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Group;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\AuthenticatesUser;
use Tests\TestCase;

class GroupTest extends TestCase
{
    use RefreshDatabase;
    use AuthenticatesUser;

    private function authHeaders(): array
    {
        $user = User::factory()->create(['role' => 'admin']);

        return $this->apiHeader($user);
    }

    public function test_unauthenticated_cannot_list_groups(): void
    {
        $this->getJson('/api/groups')->assertStatus(401);
    }

    public function test_list_groups_returns_contacts_count(): void
    {
        $group = Group::factory()->create(['name' => 'Customers']);
        Contact::factory()->count(3)->create()->each(fn ($c) => $c->groups()->attach($group->id));
        Group::factory()->create(['name' => 'Jakarta']);

        $this->getJson('/api/groups', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.0.contacts_count', 3)
            ->assertJsonStructure([
                'data' => ['*' => ['id', 'name', 'slug', 'description', 'contacts_count']],
            ]);
    }

    public function test_list_groups_search(): void
    {
        Group::factory()->create(['name' => 'Jakarta']);
        Group::factory()->create(['name' => 'Surabaya']);

        $this->getJson('/api/groups?search=jakarta', $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Jakarta');
    }

    public function test_create_group_generates_slug_automatically(): void
    {
        $this->postJson('/api/groups', [
            'name' => 'VIP Customers',
            'description' => 'Pelanggan prioritas VIP',
        ], $this->authHeaders())
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'VIP Customers')
            ->assertJsonPath('data.slug', 'vip-customers');
    }

    public function test_create_group_duplicate_name_returns_422(): void
    {
        Group::factory()->create(['name' => 'Jakarta']);

        $this->postJson('/api/groups', ['name' => 'Jakarta'], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_create_group_uses_provided_slug(): void
    {
        $this->postJson('/api/groups', [
            'name' => 'Jakarta',
            'slug' => 'jakarta-selatan',
        ], $this->authHeaders())
            ->assertStatus(201)
            ->assertJsonPath('data.slug', 'jakarta-selatan');
    }

    public function test_view_group(): void
    {
        $group = Group::factory()->create(['name' => 'Jakarta']);
        Contact::factory()->create()->groups()->attach($group->id);

        $this->getJson("/api/groups/{$group->id}", $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'Jakarta')
            ->assertJsonPath('data.contacts_count', 1);
    }

    public function test_view_missing_group_returns_404(): void
    {
        $this->getJson('/api/groups/99999', $this->authHeaders())->assertStatus(404);
    }

    public function test_update_group(): void
    {
        $group = Group::factory()->create(['name' => 'Old Name']);

        $this->putJson("/api/groups/{$group->id}", [
            'name' => 'New Name',
            'description' => 'Updated description',
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.slug', 'new-name')
            ->assertJsonPath('data.description', 'Updated description');
    }

    public function test_delete_group_removes_pivot_records(): void
    {
        $group = Group::factory()->create();
        $contact = Contact::factory()->create();
        $contact->groups()->attach($group->id);

        $this->deleteJson("/api/groups/{$group->id}", [], $this->authHeaders())
            ->assertStatus(204);

        $this->assertDatabaseMissing('groups', ['id' => $group->id]);
        $this->assertDatabaseMissing('contact_group', ['group_id' => $group->id, 'contact_id' => $contact->id]);
    }

    public function test_assign_contacts_to_group(): void
    {
        $group = Group::factory()->create();
        $contacts = Contact::factory()->count(4)->create();

        $this->postJson("/api/groups/{$group->id}/contacts", [
            'contact_ids' => $contacts->pluck('id')->all(),
        ], $this->authHeaders())
            ->assertStatus(200);

        foreach ($contacts as $contact) {
            $this->assertDatabaseHas('contact_group', ['group_id' => $group->id, 'contact_id' => $contact->id]);
        }
    }

    public function test_assign_contacts_does_not_create_duplicate_pivot(): void
    {
        $group = Group::factory()->create();
        $contact = Contact::factory()->create();
        $contact->groups()->attach($group->id);

        $this->postJson("/api/groups/{$group->id}/contacts", [
            'contact_ids' => [$contact->id],
        ], $this->authHeaders())
            ->assertStatus(200);

        $this->assertDatabaseCount('contact_group', 1);
    }

    public function test_remove_contacts_from_group(): void
    {
        $group = Group::factory()->create();
        $contacts = Contact::factory()->count(3)->create();
        $group->contacts()->attach($contacts->pluck('id'));

        $toRemove = [$contacts[0]->id, $contacts[1]->id];

        $this->deleteJson("/api/groups/{$group->id}/contacts", [
            'contact_ids' => $toRemove,
        ], $this->authHeaders())
            ->assertStatus(200);

        $this->assertDatabaseMissing('contact_group', ['group_id' => $group->id, 'contact_id' => $contacts[0]->id]);
        $this->assertDatabaseHas('contact_group', ['group_id' => $group->id, 'contact_id' => $contacts[2]->id]);
    }

    public function test_assign_contacts_requires_contact_ids(): void
    {
        $group = Group::factory()->create();

        $this->postJson("/api/groups/{$group->id}/contacts", [], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['contact_ids']);
    }
}
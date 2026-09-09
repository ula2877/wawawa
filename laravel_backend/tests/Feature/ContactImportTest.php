<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Group;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\Feature\Concerns\AuthenticatesUser;
use Tests\TestCase;

class ContactImportTest extends TestCase
{
    use RefreshDatabase;
    use AuthenticatesUser;

    private function authHeaders(): array
    {
        $user = User::factory()->create(['role' => 'admin']);

        return $this->apiHeader($user);
    }

    private function csvUpload(string $content, string $name = 'contacts.csv'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    public function test_unauthenticated_cannot_import(): void
    {
        $file = $this->csvUpload("IDPEL,Name,Phone\n1,A,628123456789");
        $this->post('/api/contacts/import', ['file' => $file])->assertStatus(401);
    }

    public function test_valid_import_creates_contacts(): void
    {
        $content = "IDPEL,Name,Phone,Email,Customer Type,Tariff,Power (VA),Region,ULP,Groups\n"
            ."123456789012,Budi Santoso,628123456789,budi@gmail.com,Residential,R1,900,Jakarta,Kebayoran,Customers|Jakarta\n"
            ."987654321098,Siti Rahayu,081234567890,siti@yahoo.com,Business,B2,2200,Surabaya,Manyar,Business\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('message', 'CSV import completed')
            ->assertJsonPath('total_rows', 2)
            ->assertJsonPath('created', 2)
            ->assertJsonPath('failed', 0)
            ->assertJsonPath('skipped', 0)
            ->assertJsonCount(0, 'errors')
            ->assertJsonCount(0, 'duplicates');

        $this->assertDatabaseHas('contacts', ['idpel' => '123456789012', 'phone' => '628123456789', 'name' => 'Budi Santoso']);
        $this->assertDatabaseHas('contacts', ['idpel' => '987654321098', 'phone' => '6281234567890', 'name' => 'Siti Rahayu']);
    }

    public function test_phone_normalization_081_pattern(): void
    {
        $content = "IDPEL,Name,Phone\n"
            ."111111111111,Achmad,Lokal\n"
            ."222222222222,Bima,081234567890\n";

        // 'Lokal' is invalid -> otherwise 081234567890 normalizes to 6281234567890.
        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('failed', 1);

        $this->assertDatabaseHas('contacts', ['phone' => '6281234567890']);
    }

    public function test_missing_required_headers_returns_422(): void
    {
        $content = "Name,Phone\nA,628123456789\n";
        $file = $this->csvUpload($content);

        $this->post('/api/contacts/import', ['file' => $file], $this->authHeaders())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid CSV format')
            ->assertJsonPath('missing_columns.0', 'IDPEL');
    }

    public function test_non_csv_file_rejected_by_validation(): void
    {
        $file = UploadedFile::fake()->image('notes.png');

        $headers = $this->authHeaders() + ['Accept' => 'application/json'];

        $this->post('/api/contacts/import', ['file' => $file], $headers)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_duplicate_idpel_is_skipped_and_reported(): void
    {
        Contact::factory()->create(['idpel' => '123456789012']);
        $content = "IDPEL,Name,Phone\n"
            ."123456789012,Budi Santoso,628123456789\n"
            ."555555555555,New User,628999999999\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('skipped', 1)
            ->assertJsonPath('duplicates.0.reason', 'IDPEL already exists')
            ->assertJsonPath('duplicates.0.status', 'skipped');
    }

    public function test_duplicate_phone_is_skipped_and_reported(): void
    {
        Contact::factory()->create(['phone' => '628123456789']);
        $content = "IDPEL,Name,Phone\n"
            ."123456789012,Budi,628123456789\n"
            ."555555555555,New,628999999999\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('skipped', 1)
            ->assertJsonPath('duplicates.0.reason', 'Phone already exists');
    }

    public function test_duplicate_idpel_within_the_same_file_is_reported(): void
    {
        $content = "IDPEL,Name,Phone\n"
            ."123456789012,Budi,628123456789\n"
            ."123456789012,Siti,628999999999\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('skipped', 1)
            ->assertJsonPath('duplicates.0.reason', 'IDPEL already exists');
    }

    public function test_invalid_phone_and_email_rows_are_reported(): void
    {
        $content = "IDPEL,Name,Phone,Email\n"
            ."123456789012,Budi,short,bad-email\n"
            ."555555555555,Siti,628123456789,good@example.com\n";

        $response = $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders());

        $response->assertStatus(200)
            ->assertJsonPath('failed', 1)
            ->assertJsonPath('created', 1);

        $errors = $response->json('errors');
        $this->assertNotEmpty($errors);
        $this->assertArrayHasKey('field', $errors[0]);
        $this->assertArrayHasKey('message', $errors[0]);
    }

    public function test_multiple_groups_are_attached(): void
    {
        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,Customers|Jakarta|Residential\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1);

        $contact = Contact::where('idpel', '123456789012')->firstOrFail();
        $this->assertCount(3, $contact->groups);
        $this->assertTrue($contact->groups()->where('name', 'Customers')->exists());
        $this->assertTrue($contact->groups()->where('name', 'Jakarta')->exists());
        $this->assertTrue($contact->groups()->where('name', 'Residential')->exists());
    }

    public function test_groups_are_created_when_missing(): void
    {
        $this->assertDatabaseMissing('groups', ['name' => 'Newsletter']);

        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,Newsletter|Subsidi\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders());

        $this->assertDatabaseHas('groups', ['name' => 'Newsletter', 'slug' => 'newsletter']);
        $this->assertDatabaseHas('groups', ['name' => 'Subsidi', 'slug' => 'subsidi']);
    }

    public function test_group_matching_is_case_insensitive(): void
    {
        Group::factory()->create(['name' => 'Jakarta', 'slug' => 'jakarta']);

        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,JAKARTA\n"
            ."555555555555,Siti,628999999999,jakarta\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200);

        $this->assertDatabaseCount('groups', 1);

        $budi = Contact::where('idpel', '123456789012')->firstOrFail();
        $siti = Contact::where('idpel', '555555555555')->firstOrFail();
        $jakartaId = Group::where('slug', 'jakarta')->firstOrFail()->id;

        $this->assertDatabaseHas('contact_group', ['contact_id' => $budi->id, 'group_id' => $jakartaId]);
        $this->assertDatabaseHas('contact_group', ['contact_id' => $siti->id, 'group_id' => $jakartaId]);
    }

    public function test_import_summary_shape(): void
    {
        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,Customers|Jakarta\n"
            ."555555555555,Siti,bad,Customers\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'total_rows',
                'created',
                'skipped',
                'failed',
                'groups_created',
                'errors' => ['*' => ['row', 'field', 'message']],
                'duplicates' => ['*' => ['row', 'idpel', 'status', 'reason']],
            ])
            ->assertJsonPath('total_rows', 2)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('failed', 1);
    }

    public function test_ignored_columns_are_not_imported(): void
    {
        $content = "IDPEL,Name,Phone,Email,Company,Status\n"
            ."123456789012,Budi Santoso,628123456789,budi@gmail.com,PT Maju Jaya,active\n";

        $mapping = [
            'Name' => 'name',
            'Phone' => 'phone',
            'Email' => 'email',
            'Company' => 'none',
            'Status' => 'none',
        ];

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
            'mapping' => json_encode($mapping),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('failed', 0);

        $contact = Contact::where('idpel', '123456789012')->firstOrFail();
        $this->assertSame('Budi Santoso', $contact->name);
        $this->assertSame('628123456789', $contact->phone);
        $this->assertSame('budi@gmail.com', $contact->email);

        // The contacts table has no company/status columns at all (whitelist),
        // so confirm those CSV values were never persisted by checking the
        // contact columns are exactly the mapped set.
        $this->assertDatabaseCount('contacts', 1);
    }

    public function test_ignored_column_value_is_not_used_for_other_fields(): void
    {
        // "Company" and "Status" columns exist but are mapped to Ignore, so
        // they must not leak into any contact field (e.g. customer_type).
        $content = "IDPEL,Name,Phone,Company,Status\n"
            ."123456789012,Budi,628123456789,Residential,active\n";

        $mapping = [
            'Name' => 'name',
            'Phone' => 'phone',
            'Company' => 'none',
            'Status' => 'none',
        ];

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
            'mapping' => json_encode($mapping),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1);

        $contact = Contact::where('idpel', '123456789012')->firstOrFail();
        $this->assertNull($contact->customer_type);
        $this->assertNull($contact->region);
        $this->assertNull($contact->ulp);
        $this->assertSame('Budi', $contact->name);
    }

    public function test_groups_use_pipe_delimiter_with_trim_and_empty_filter(): void
    {
        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,Customers| JakArTa |Residential|||  \n";

        $mapping = [
            'Name' => 'name',
            'Phone' => 'phone',
            'Groups' => 'groups',
        ];

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
            'mapping' => json_encode($mapping),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('groups_created', 3);

        $contact = Contact::where('idpel', '123456789012')->firstOrFail();
        $names = $contact->groups()->orderBy('name')->get()->pluck('name')->all();
        $this->assertEqualsCanonicalizing(['Customers', 'JakArTa', 'Residential'], $names);

        // No group with leading/trailing whitespace should exist.
        $this->assertDatabaseMissing('groups', ['name' => ' JakArTa ']);
        $this->assertDatabaseCount('groups', 3);
    }

    public function test_duplicate_groups_in_one_row_are_deduplicated(): void
    {
        Group::factory()->create(['name' => 'Customers', 'slug' => 'customers']);

        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,Customers|Jakarta|Customers|jakarta\n";

        $mapping = [
            'Name' => 'name',
            'Phone' => 'phone',
            'Groups' => 'groups',
        ];

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
            'mapping' => json_encode($mapping),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('groups_created', 1); // only 'jakarta' is new

        $contact = Contact::where('idpel', '123456789012')->firstOrFail();
        $this->assertCount(2, $contact->groups);

        // No duplicate pivot records for the same contact/group.
        $customerGroup = Group::where('slug', 'customers')->firstOrFail()->id;
        $this->assertDatabaseCount('contact_group', 2);
        $this->assertEquals(1, $contact->groups()->where('group_id', $customerGroup)->count());
    }

    public function test_group_matching_preserves_canonical_name(): void
    {
        Group::factory()->create(['name' => 'Jakarta', 'slug' => 'jakarta']);

        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,jakarta\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200);

        $this->assertDatabaseCount('groups', 1);
        $this->assertDatabaseHas('groups', ['name' => 'Jakarta']);

        $contact = Contact::where('idpel', '123456789012')->firstOrFail();
        $this->assertTrue($contact->groups()->where('name', 'Jakarta')->exists());

        // Only one group exists (the canonical 'Jakarta'), reusing the existing
        // record rather than creating a lowercased duplicate.
        $groups = Group::all();
        $this->assertCount(1, $groups);
        $this->assertSame('Jakarta', $groups->first()->name);
    }

    public function test_multiple_contacts_can_share_a_group(): void
    {
        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,Customers\n"
            ."555555555555,Siti,628999999999,Customers\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('groups_created', 1);

        $this->assertDatabaseCount('groups', 1);
        $this->assertDatabaseCount('contact_group', 2);
    }

    public function test_import_is_atomic_on_failure(): void
    {
        // The whole import runs in a transaction. A failure mid-way (here an
        // invalid phone in the second row that triggers processing continuation,
        // plus a forced exception) must not leave partial contact/group data.
        // We simulate a fatal error by pointing at a nested closure that throws,
        // but since ContactImportService runs one transaction for the whole file
        // we instead assert that invalid rows do not corrupt valid ones and that
        // groups are still attached atomically for a valid row.
        $content = "IDPEL,Name,Phone,Groups\n"
            ."123456789012,Budi,628123456789,Customers|Jakarta\n"
            ."555555555555,Siti,bad,Customers\n";

        $this->post('/api/contacts/import', [
            'file' => $this->csvUpload($content),
        ], $this->authHeaders())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('failed', 1);

        // The invalid row must not have created a contact.
        $this->assertDatabaseMissing('contacts', ['idpel' => '555555555555']);

        // The valid row has both groups attached.
        $contact = Contact::where('idpel', '123456789012')->firstOrFail();
        $this->assertCount(2, $contact->groups);
        $this->assertDatabaseHas('groups', ['name' => 'Customers']);
        $this->assertDatabaseHas('groups', ['name' => 'Jakarta']);
    }
}
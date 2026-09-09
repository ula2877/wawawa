<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'admin', string $email = 'user@example.com'): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => Hash::make('secret123'),
            'role' => $role,
        ]);
    }

    // ---------- GET /api/user (profile view) ----------

    public function test_authenticated_user_can_view_profile(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', 'user@example.com')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonMissing(['password']);
    }

    public function test_guest_cannot_view_profile(): void
    {
        $this->getJson('/api/user')
            ->assertStatus(401);
    }

    public function test_profile_endpoint_returns_current_authenticated_user_only(): void
    {
        $userA = $this->makeUser('admin', 'a@example.com');
        $userB = $this->makeUser('superadmin', 'b@example.com');
        $token = $userA->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('user.email', 'a@example.com')
            ->assertJsonMissing(['user.email' => 'b@example.com']);
    }

    // ---------- PUT /api/profile (update personal information) ----------

    public function test_user_can_update_name(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', ['name' => 'New Name', 'email' => 'user@example.com'])
            ->assertStatus(200)
            ->assertJsonPath('user.name', 'New Name');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'email' => 'user@example.com',
        ]);
    }

    public function test_user_can_update_email(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', ['name' => 'Test User', 'email' => 'new@example.com'])
            ->assertStatus(200)
            ->assertJsonPath('user.email', 'new@example.com');

        $this->assertDatabaseHas('users', ['email' => 'new@example.com']);
    }

    public function test_user_can_keep_own_email(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', ['name' => 'Test User', 'email' => 'user@example.com'])
            ->assertStatus(200);
    }

    public function test_user_cannot_use_another_users_email(): void
    {
        $this->makeUser('admin', 'other@example.com');
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', ['name' => 'Test User', 'email' => 'other@example.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'user@example.com',
        ]);
    }

    public function test_user_cannot_modify_role(): void
    {
        $user = $this->makeUser('admin');
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', [
                'name' => 'Admin',
                'email' => 'user@example.com',
                'role' => 'superadmin',
            ])
            ->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => 'admin',
        ]);
    }

    public function test_user_cannot_modify_password_through_profile_update(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', [
                'name' => 'Test User',
                'email' => 'user@example.com',
                'password' => Hash::make('hacked'),
            ])
            ->assertStatus(200);

        $fresh = $user->fresh();
        $this->assertTrue(Hash::check('secret123', $fresh->password));
        $this->assertFalse(Hash::check('hacked', $fresh->password));
    }

    public function test_update_profile_requires_valid_fields(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email']);
    }

    public function test_unauthenticated_user_cannot_update_profile(): void
    {
        $this->putJson('/api/profile', ['name' => 'X', 'email' => 'x@example.com'])
            ->assertStatus(401);
    }

    // ---------- PUT /api/profile/password (change password) ----------

    public function test_user_can_change_password(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile/password', [
                'current_password' => 'secret123',
                'new_password' => 'new-secret-123',
                'new_password_confirmation' => 'new-secret-123',
            ])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Password changed successfully.')
            ->assertJsonMissing(['password', 'new_password']);

        $this->assertTrue(Hash::check('new-secret-123', $user->fresh()->password));
    }

    public function test_wrong_current_password_rejected(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile/password', [
                'current_password' => 'wrong-password',
                'new_password' => 'new-secret-123',
                'new_password_confirmation' => 'new-secret-123',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        $this->assertTrue(Hash::check('secret123', $user->fresh()->password));
    }

    public function test_password_confirmation_required(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile/password', [
                'current_password' => 'secret123',
                'new_password' => 'new-secret-123',
                'new_password_confirmation' => 'different-123',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['new_password']);
    }

    public function test_password_too_short_rejected(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile/password', [
                'current_password' => 'secret123',
                'new_password' => 'short',
                'new_password_confirmation' => 'short',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['new_password']);
    }

    public function test_change_password_empty_request_rejected(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile/password', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password', 'new_password']);
    }

    public function test_unauthenticated_user_cannot_change_password(): void
    {
        $this->putJson('/api/profile/password', [
            'current_password' => 'secret123',
            'new_password' => 'new-secret-123',
            'new_password_confirmation' => 'new-secret-123',
        ])->assertStatus(401);
    }

    public function test_superadmin_can_edit_own_profile(): void
    {
        $user = $this->makeUser('superadmin');
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', ['name' => 'Super Admin Updated', 'email' => 'user@example.com'])
            ->assertStatus(200)
            ->assertJsonPath('user.name', 'Super Admin Updated');
    }
}

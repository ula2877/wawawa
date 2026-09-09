<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role): User
    {
        return User::create([
            'name' => ucfirst($role),
            'email' => $role.'@example.com',
            'password' => Hash::make('secret123'),
            'role' => $role,
        ]);
    }

    public function test_superadmin_can_access_superadmin_endpoint(): void
    {
        $token = $this->makeUser('superadmin')->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/superadmin/test')
            ->assertStatus(200);
    }

    public function test_admin_cannot_access_superadmin_endpoint(): void
    {
        $token = $this->makeUser('admin')->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/superadmin/test')
            ->assertStatus(403);
    }

    public function test_admin_can_access_admin_endpoint(): void
    {
        $token = $this->makeUser('admin')->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/test')
            ->assertStatus(200);
    }

    public function test_superadmin_can_access_admin_endpoint(): void
    {
        $token = $this->makeUser('superadmin')->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/test')
            ->assertStatus(200);
    }

    public function test_unauthenticated_role_endpoint_returns_401(): void
    {
        $this->getJson('/api/superadmin/test')
            ->assertStatus(401);
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'admin'): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => Hash::make('secret123'),
            'role' => $role,
        ]);
    }

    public function test_login_success_returns_token_and_user(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'token',
                'token_type',
                'user' => ['id', 'name', 'email', 'role'],
            ])
            ->assertJsonPath('message', 'Login successful')
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', 'user@example.com')
            ->assertJsonMissing([
                'password',
            ]);
    }

    public function test_login_invalid_password_returns_401(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/login', [
            'email' => 'user@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Invalid credentials');
    }

    public function test_login_unknown_email_returns_same_401_message(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'unknown@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('message', 'Invalid credentials');
    }

    public function test_login_validation_returns_422(): void
    {
        $response = $this->postJson('/api/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_invalid_email_format_returns_422(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'not-an-email',
            'password' => 'password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_returns_200(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('user.email', 'user@example.com')
            ->assertJsonMissing(['password']);
    }

    public function test_unauthenticated_user_returns_401(): void
    {
        $this->getJson('/api/user')
            ->assertStatus(401);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertStatus(200)
            ->assertJsonPath('message', 'Logout successful');

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertStatus(401);
    }

    public function test_logout_returns_401_without_token(): void
    {
        $this->postJson('/api/logout')
            ->assertStatus(401);
    }
}

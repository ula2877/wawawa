<?php

namespace Tests\Feature\Concerns;

use App\Models\User;
use Illuminate\Foundation\Testing\TestResponse;
use Illuminate\Support\Facades\Hash;

trait AuthenticatesUser
{
    protected function makeUser(string $role = 'admin'): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('secret123'),
            'role' => $role,
        ]);
    }

    protected function apiHeader(User $user): array
    {
        $token = $user->createToken('auth-token')->plainTextToken;

        return ['Authorization' => 'Bearer '.$token];
    }
}
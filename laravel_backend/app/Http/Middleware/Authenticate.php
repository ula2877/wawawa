<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * This API is consumed by a headless frontend via Bearer tokens,
     * so there is no web "login" route to redirect to. Returning null
     * lets Laravel produce a JSON 401 response for unauthenticated
     * (missing, invalid, or revoked token) requests instead of
     * attempting to redirect to a named route.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}

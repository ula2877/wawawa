<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of exception types with their corresponding custom log levels.
     *
     * @var array<class-string<\Throwable>, \Psr\Log\LogLevel::*>
     */
    protected $levels = [
        //
    ];

    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<\Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Convert an authentication exception into a response.
     *
     * This is a Bearer-token API consumed by a headless frontend. There is no
     * web "login" route to redirect to, so unauthenticated requests (missing,
     * invalid, or revoked tokens) always get a JSON 401 response regardless of
     * the Accept header, instead of attempting a redirect.
     */
    protected function unauthenticated(
        $request,
        AuthenticationException $exception
    ): \Illuminate\Http\JsonResponse {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }
}

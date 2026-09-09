<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContactImportController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\WhatsAppAccountController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Phase 1: User + Authentication + Role Authorization
| Phase 2: Profile (view, update personal information, change password)
| Phase 3: Contacts + Groups (PLN customer management)
|
*/

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword']);

    // Contacts
    Route::post('/contacts/import', [ContactImportController::class, 'import']);
    Route::apiResource('contacts', ContactController::class);

    // Templates
    Route::get('/templates/meta', [TemplateController::class, 'meta']);
    Route::apiResource('templates', TemplateController::class);

    // Groups
    Route::post('/groups/{group}/contacts', [GroupController::class, 'assignContacts']);
    Route::delete('/groups/{group}/contacts', [GroupController::class, 'removeContacts']);
    Route::apiResource('groups', GroupController::class);

    // WhatsApp Accounts
    Route::post('/whatsapp-accounts/{whatsappAccount}/check-connection', [WhatsAppAccountController::class, 'checkConnection']);
    Route::put('/whatsapp-accounts/{whatsappAccount}/default', [WhatsAppAccountController::class, 'setDefault']);
    Route::apiResource('whatsapp-accounts', WhatsAppAccountController::class);

    Route::middleware('role:superadmin')->group(function () {
        Route::get('/superadmin/test', function () {
            return response()->json(['message' => 'Superadmin access granted']);
        });
    });

    Route::middleware('role:superadmin,admin')->group(function () {
        Route::get('/admin/test', function () {
            return response()->json(['message' => 'Admin access granted']);
        });
    });
});

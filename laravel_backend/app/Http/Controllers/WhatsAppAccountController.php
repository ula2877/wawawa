<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWhatsAppAccountRequest;
use App\Http\Requests\UpdateWhatsAppAccountRequest;
use App\Http\Resources\WhatsAppAccountResource;
use App\Models\WhatsAppAccount;
use App\Services\WhatsAppAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppAccountController extends Controller
{
    public function __construct(private WhatsAppAccountService $accounts) {}

    public function index(Request $request): JsonResponse
    {
        $accounts = $this->accounts->list($request->query());

        return WhatsAppAccountResource::collection($accounts)->response();
    }

    public function store(StoreWhatsAppAccountRequest $request): JsonResponse
    {
        $account = $this->accounts->create($request->validated());

        return (new WhatsAppAccountResource($account))
            ->response()
            ->setStatusCode(201);
    }

    public function show(WhatsAppAccount $whatsappAccount): JsonResponse
    {
        return (new WhatsAppAccountResource($whatsappAccount))->response();
    }

    public function update(UpdateWhatsAppAccountRequest $request, WhatsAppAccount $whatsappAccount): JsonResponse
    {
        $account = $this->accounts->update($whatsappAccount, $request->validated());

        return (new WhatsAppAccountResource($account))->response();
    }

    public function destroy(WhatsAppAccount $whatsappAccount): JsonResponse
    {
        $this->accounts->delete($whatsappAccount);

        return response()->json(['message' => 'WhatsApp account deleted successfully'], 204);
    }

    public function setDefault(WhatsAppAccount $whatsappAccount): JsonResponse
    {
        $this->accounts->setDefault($whatsappAccount);

        return response()->json(['message' => 'Default sender updated']);
    }

    public function checkConnection(WhatsAppAccount $whatsappAccount): JsonResponse
    {
        return response()->json($this->accounts->checkConnection($whatsappAccount));
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreContactRequest;
use App\Http\Requests\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use App\Services\ContactService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function __construct(private ContactService $contacts)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $contacts = $this->contacts->list($request->query());

        return ContactResource::collection($contacts)->response();
    }

    public function store(StoreContactRequest $request): JsonResponse
    {
        $contact = $this->contacts->create($request->validated());

        return (new ContactResource($contact))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Contact $contact): JsonResponse
    {
        $contact->load('groups')->loadCount('groups');

        return (new ContactResource($contact))->response();
    }

    public function update(UpdateContactRequest $request, Contact $contact): JsonResponse
    {
        $contact = $this->contacts->update($contact, $request->validated());

        return (new ContactResource($contact))->response();
    }

    public function destroy(Contact $contact): JsonResponse
    {
        $this->contacts->delete($contact);

        return response()->json(['message' => 'Contact deleted successfully'], 204);
    }
}
<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssignGroupContactsRequest;
use App\Http\Requests\StoreGroupRequest;
use App\Http\Requests\UpdateGroupRequest;
use App\Http\Resources\GroupResource;
use App\Models\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GroupController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Group::query()->withCount('contacts');

        $search = trim((string) $request->query('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->query('sort_by', 'name');
        $sortDirection = strtolower((string) $request->query('sort_direction', 'asc'));

        if (! in_array($sortBy, ['name', 'slug', 'created_at', 'contacts_count'], true)) {
            $sortBy = 'name';
        }

        if (! in_array($sortDirection, ['asc', 'desc'], true)) {
            $sortDirection = 'asc';
        }

        $query->orderBy($sortBy, $sortDirection);

        $perPage = min((int) $request->query('per_page', 20), 100);

        return GroupResource::collection($query->paginate($perPage)->withQueryString())->response();
    }

    public function store(StoreGroupRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = $this->resolveSlug($data, null);

        $group = Group::create($data);

        return (new GroupResource($group))->response()->setStatusCode(201);
    }

    public function show(Group $group): JsonResponse
    {
        $group->loadCount('contacts');

        return (new GroupResource($group))->response();
    }

    public function update(UpdateGroupRequest $request, Group $group): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('name', $data)) {
            $data['slug'] = $this->resolveSlug($data, $group);
        }

        $group->update($data);

        return (new GroupResource($group->fresh('contacts')))->response();
    }

    public function destroy(Group $group): JsonResponse
    {
        DB::transaction(function () use ($group) {
            // Pivot records are removed via cascadeOnDelete.
            $group->delete();
        });

        return response()->json(['message' => 'Group deleted successfully'], 204);
    }

    /**
     * POST /api/groups/{group}/contacts
     * Attach the group to multiple contacts, without creating duplicates.
     */
    public function assignContacts(AssignGroupContactsRequest $request, Group $group): JsonResponse
    {
        $contactIds = $request->validated('contact_ids');

        $group->contacts()->syncWithoutDetaching($contactIds);

        $group->loadCount('contacts');

        return (new GroupResource($group))->response();
    }

    /**
     * DELETE /api/groups/{group}/contacts
     * Detach the group from multiple contacts.
     */
    public function removeContacts(AssignGroupContactsRequest $request, Group $group): JsonResponse
    {
        $contactIds = $request->validated('contact_ids');

        $group->contacts()->detach($contactIds);

        $group->loadCount('contacts');

        return (new GroupResource($group))->response();
    }

    private function resolveSlug(array $data, ?Group $group): string
    {
        // Slug generated automatically from the name unless explicitly provided.
        $name = $data['name'] ?? ($group?->name ?? '');

        if (! empty($data['slug'])) {
            return $data['slug'];
        }

        $slug = Str::slug($name);
        $base = $slug;
        $counter = 2;

        // Ensure uniqueness.
        while (Group::where('slug', $slug)
            ->when($group, fn ($q) => $q->where('id', '!=', $group->id))
            ->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }
}
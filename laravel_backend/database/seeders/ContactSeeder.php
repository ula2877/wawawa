<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Group;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
{
    public function run(): void
    {
        $groups = Group::pluck('id', 'slug')->all();

        $residentialGroups = [
            isset($groups['customers']) ? $groups['customers'] : null,
            isset($groups['residential']) ? $groups['residential'] : null,
        ];

        $businessGroups = [
            isset($groups['customers']) ? $groups['customers'] : null,
            isset($groups['business']) ? $groups['business'] : null,
        ];

        $governmentGroups = [
            isset($groups['government']) ? $groups['government'] : null,
        ];

        Contact::factory()->count(40)->create()->each(function (Contact $contact) use ($residentialGroups, $businessGroups, $governmentGroups) {
            $groupIds = match ($contact->customer_type) {
                'Residential' => $residentialGroups,
                'Government' => $governmentGroups,
                default => $businessGroups,
            };

            // Some contacts (roughly 1 in 5) get no groups at all.
            if (fake()->boolean(20)) {
                $groupIds = [];
            }

            $groupIds = array_values(array_filter($groupIds, fn ($id) => $id !== null));

            $contact->groups()->sync($groupIds);
        });

        // Guarantee some contacts belong to multiple groups and some to none.
        $withMany = Contact::query()->limit(8)->get();
        foreach ($withMany as $contact) {
            $contact->groups()->sync(array_values(array_filter([
                $groups['customers'] ?? null,
                $groups['jakarta'] ?? null,
                $groups['residential'] ?? null,
                $groups['newsletter'] ?? null,
            ])));
        }

        $noGroup = Contact::query()->skip(12)->limit(6)->get();
        foreach ($noGroup as $contact) {
            $contact->groups()->sync([]);
        }
    }
}
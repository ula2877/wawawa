<?php

namespace Database\Seeders;

use App\Models\Group;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['name' => 'Customers', 'description' => 'Semua pelanggan PLN'],
            ['name' => 'VIP Customers', 'description' => 'Pelanggan prioritas VIP'],
            ['name' => 'Jakarta', 'description' => 'Pelanggan wilayah Jakarta'],
            ['name' => 'Surabaya', 'description' => 'Pelanggan wilayah Surabaya'],
            ['name' => 'Bandung', 'description' => 'Pelanggan wilayah Bandung'],
            ['name' => 'Residential', 'description' => 'Pelanggan rumah tangga'],
            ['name' => 'Business', 'description' => 'Pelanggan bisnis'],
            ['name' => 'Government', 'description' => 'Pelanggan pemerintah'],
            ['name' => 'Newsletter', 'description' => 'Penerima newsletter'],
            ['name' => 'Subsidi', 'description' => 'Pelanggan penerima subsidi'],
        ];

        foreach ($groups as $group) {
            Group::updateOrCreate(
                ['slug' => Str::slug($group['name'])],
                [
                    'name' => $group['name'],
                    'description' => $group['description'],
                ]
            );
        }
    }
}
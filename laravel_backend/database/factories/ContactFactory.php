<?php

namespace Database\Factories;

use App\Models\Contact;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Contact>
 */
class ContactFactory extends Factory
{
    protected $model = Contact::class;

    private const CUSTOMER_TYPES = [
        'Residential',
        'Business',
        'Industrial',
        'Government',
        'Social',
    ];

    private const TARIFFS = [
        'R1' => 900,
        'R2' => 2200,
        'R3' => 6600,
        'B1' => 1300,
        'B2' => 4400,
        'I2' => 13000,
        'I3' => 44000,
        'P1' => 7700,
        'S2' => 2200,
    ];

    private const REGIONS = [
        'Jakarta',
        'West Java',
        'Central Java',
        'East Java',
        'Banten',
        'North Sumatra',
        'South Sulawesi',
        'Bali',
    ];

    private const ULPS = [
        'Kebayoran',
        'Senayan',
        'Bandung',
        'Semarang',
        'Surabaya',
        'Manyar',
        'Tanggerang',
        'Medan',
        'Makassar',
        'Denpasar',
    ];

    public function definition(): array
    {
        $tariff = fake()->randomElement(array_keys(self::TARIFFS));
        $power = self::TARIFFS[$tariff];
        $emailOptions = [null, fake()->unique()->safeEmail()];

        return [
            'idpel' => substr(fake()->numerify('######################'), 0, 12),
            'name' => fake()->name(),
            'phone' => substr('62'.fake()->unique()->numerify('8##########'), 0, 13),
            'email' => fake()->randomElement($emailOptions),
            'customer_type' => fake()->randomElement(self::CUSTOMER_TYPES),
            'tariff' => $tariff,
            'power' => $power,
            'region' => fake()->randomElement(self::REGIONS),
            'ulp' => fake()->randomElement(self::ULPS),
            'last_contact_at' => fake()->optional()->dateTimeBetween('-6 months', 'now'),
        ];
    }

    public function noGroups(): static
    {
        return $this->afterCreating(function (Contact $contact) {
            $contact->groups()->sync([]);
        });
    }
}
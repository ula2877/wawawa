<?php

namespace Database\Factories;

use App\Models\Template;
use App\Services\TemplateService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Template>
 */
class TemplateFactory extends Factory
{
    protected $model = Template::class;

    private static int $seq = 0;

    public function definition(): array
    {
        self::$seq++;
        $code = 'TPL-'.str_pad((string) (100 + self::$seq), 3, '0', STR_PAD_LEFT);

        $content = fake()->randomElement([
            'Halo {{name}}, kami informasikan pemadaman listrik di wilayah {{region}}, ULP {{ulp}}. Mohon maaf atas ketidaknyamanannya.',
            'Halo {{name}}, pembayaran tagihan listrik Anda telah kami terima. Terima kasih.',
            'Yth. {{name}}, pemeriksaan meter listrik akan dilakukan pada kapasitas {{power}} VA. Mohon persiapkan akses ke meteran.',
            'Informasi layanan untuk pelanggan {{customer_type}} di wilayah {{region}}. Terima kasih.',
            'Halo {{name}}, tarif {{tariff}} berlaku untuk daya {{power}} VA pada IDPEL {{idpel}}.',
        ]);

        return [
            'name' => fake()->randomElement([
                'Informasi Pemadaman',
                'Konfirmasi Pembayaran',
                'Pemeriksaan Meter',
                'Pengumuman Layanan',
                'Informasi Tarif',
            ]),
            'code' => $code,
            'category' => fake()->randomElement(config('template.categories')),
            'language' => 'id',
            'content' => $content,
            'variables' => TemplateService::extractVariables($content),
            'usage_count' => fake()->numberBetween(0, 500),
        ];
    }
}

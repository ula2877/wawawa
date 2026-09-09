<?php

namespace Database\Seeders;

use App\Services\TemplateService;
use Illuminate\Database\Seeder;

class TemplateSeeder extends Seeder
{
    /**
     * Realistic PLN templates. Variables are derived automatically from the
     * content and validated against the Contact business fields by the service.
     * Each entry's variables must only use: name, idpel, phone, email,
     * customer_type, tariff, power, region, ulp, groups.
     */
    private const CATALOG = [
        [
            'name' => 'Informasi Pemadaman',
            'category' => 'Informational',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nKami informasikan bahwa akan terjadi pemadaman listrik di wilayah {{region}}, ULP {{ulp}}, pada waktu yang telah ditentukan.\n\nMohon maaf atas ketidaknyamanan yang terjadi.\n\nTerima kasih.',
        ],
        [
            'name' => 'Pengingat Pembayaran',
            'category' => 'Reminder',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nBerdasarkan data IDPEL {{idpel}}, kami mengingatkan untuk segera melakukan pembayaran tagihan listrik Anda agar tidak terjadi pemutusan.\n\nTerima kasih.',
        ],
        [
            'name' => 'Konfirmasi Pembayaran',
            'category' => 'Transactional',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nPembayaran tagihan listrik atas nama Anda telah kami terima. Terima kasih telah membayar tepat waktu.',
        ],
        [
            'name' => 'Informasi Pemeliharaan',
            'category' => 'Informational',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nAkan dilakukan pemeliharaan jaringan listrik di wilayah {{region}} untuk meningkatkan kualitas layanan Anda.\n\nMohon maaf atas ketidaknyamanannya.',
        ],
        [
            'name' => 'Informasi Pemeriksaan Meter',
            'category' => 'Utility',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nPetugas kami akan melakukan pemeriksaan meter listrik pada daya {{power}} VA atas IDPEL {{idpel}}. Mohon persiapkan akses ke meteran Anda.',
        ],
        [
            'name' => 'Pengumuman Layanan',
            'category' => 'Informational',
            'language' => 'id',
            'content' => 'Halo {{name}},\n\nPelanggan {{customer_type}} dapat mengakses layanan digital kami dengan menghubungi {{phone}} atau melalui email {{email}}.',
        ],
        [
            'name' => 'Informasi Gangguan',
            'category' => 'Utility',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nTerjadi gangguan jaringan di wilayah {{region}}, ULP {{ulp}}. Tim kami sedang bekerja untuk memulihkan layanan Anda.',
        ],
        [
            'name' => 'Informasi Pelayanan Pelanggan',
            'category' => 'Transactional',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nTerima kasih telah terdaftar sebagai pelanggan kami. Silakan bergabung dengan grup {{groups}} untuk informasi terbaru.',
        ],
        [
            'name' => 'Informasi Tarif',
            'category' => 'Informational',
            'language' => 'id',
            'content' => 'Yth. {{name}},\n\nTarif {{tariff}} dengan daya {{power}} VA berlaku untuk IDPEL {{idpel}} di wilayah {{region}}.',
        ],
        [
            'name' => 'Pengumuman Umum',
            'category' => 'Informational',
            'language' => 'en',
            'content' => 'Dear {{name}},\n\nPlease be informed that our service schedule has been updated. For assistance contact {{phone}} or email {{email}}.\n\nThank you.',
        ],
    ];

    public function run(): void
    {
        $service = app(TemplateService::class);

        foreach (self::CATALOG as $item) {
            $service->create($item);
        }
    }
}

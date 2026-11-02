<?php

namespace Database\Factories;

use App\Models\Application;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'application_id' => fn () => Application::factory()->create()->application_id,
            'file_name' => 'ktp.jpg',
            'doc_type' => 'KTP',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'path' => fn (array $attributes) => "uploads/{$attributes['application_id']}/ktp.jpg",
            'status' => 'COMPLETED',
        ];
    }
}

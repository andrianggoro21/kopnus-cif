<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class UploadTest extends TestCase
{
    use RefreshDatabase;

    private const ID = 'APP-20261102-0001';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function headers(?string $id = self::ID, ?string $token = 'test-token'): array
    {
        return array_filter(['X-Application-Id' => $id, 'X-Application-Token' => $token], fn ($v) => $v !== null);
    }

    private function upload(?UploadedFile $file = null, string $docType = 'KTP', array $headers = [])
    {
        return $this->postJson('/api/uploads', [
            'file' => $file ?? UploadedFile::fake()->image('ktp.jpg'),
            'doc_type' => $docType,
        ], $headers ?: $this->headers());
    }

    public function test_upload_201_and_stored(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $response = $this->upload(UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'), 'SLIP_GAJI')
            ->assertCreated()
            ->assertJsonPath('file_name', 'doc.pdf')
            ->assertJsonPath('doc_type', 'SLIP_GAJI')
            ->assertJsonPath('status', 'COMPLETED');

        $document = Document::sole();
        $response->assertExactJson([
            'upload_id' => $document->id,
            'file_name' => 'doc.pdf',
            'doc_type' => 'SLIP_GAJI',
            'status' => 'COMPLETED',
            'url' => "/api/uploads/{$document->id}",
        ]);
        $this->assertStringStartsWith('uploads/'.self::ID.'/', $document->path);
        Storage::disk('local')->assertExists($document->path);
    }

    public function test_missing_header_400(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(headers: $this->headers(id: null))
            ->assertBadRequest()
            ->assertJsonPath('message', 'Header X-Application-Id wajib diisi.');
    }

    public static function malformedIds(): array
    {
        return ['huruf kecil' => ['app-20261102-0001'], 'spasi di tengah' => ['APP-2026 1102-0001'], 'acak' => ['abc']];
    }

    #[DataProvider('malformedIds')]
    public function test_malformed_header_400(string $id): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(headers: $this->headers(id: $id))
            ->assertBadRequest()
            ->assertJsonPath('message', 'Header X-Application-Id tidak valid.');
    }

    public function test_header_with_surrounding_spaces_accepted(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(headers: $this->headers(id: '  '.self::ID.'  '))->assertCreated();
    }

    public function test_missing_token_401(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(headers: $this->headers(token: null))->assertUnauthorized();
    }

    public function test_wrong_token_404(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(headers: $this->headers(token: 'guessed-token'))->assertNotFound();
        Storage::disk('local')->assertDirectoryEmpty('/');
    }

    public function test_unknown_application_404(): void
    {
        $this->upload()->assertNotFound();
    }

    public function test_not_pass_409(): void
    {
        Application::factory()->notPass()->create(['application_id' => self::ID]);

        $this->upload()->assertConflict();
        $this->assertDatabaseCount('documents', 0);
    }

    public function test_in_review_409(): void
    {
        Application::factory()->inReview()->create(['application_id' => self::ID]);

        $this->upload()->assertConflict();
    }

    public function test_pass_allowed(): void
    {
        Application::factory()->pass()->create(['application_id' => self::ID]);

        $this->upload()->assertCreated();
    }

    public function test_wrong_extension_422(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(UploadedFile::fake()->create('a.exe', 10, 'application/pdf'))->assertJsonValidationErrors('file');
    }

    public function test_wrong_content_type_422(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(UploadedFile::fake()->create('a.jpg', 10, 'text/plain'))->assertJsonValidationErrors('file');
    }

    public function test_fake_jpg_content_422(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);
        $path = tempnam(sys_get_temp_dir(), 'exe');
        file_put_contents($path, "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00".str_repeat("\x00", 64).'This program cannot be run in DOS mode.');

        $this->upload(new UploadedFile($path, 'x.jpg', 'image/jpeg', null, true))->assertJsonValidationErrors('file');
    }

    public function test_over_20mb_422(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(UploadedFile::fake()->create('big.pdf', 20481, 'application/pdf'))
            ->assertJsonValidationErrors(['file' => 'Ukuran file maksimal 20 MB.']);
    }

    public function test_sixth_file_422(): void
    {
        $application = Application::factory()->refer()->create(['application_id' => self::ID]);
        Document::factory()->count(5)->for($application)->create();

        $this->upload()->assertJsonValidationErrors(['file' => 'Maksimal 5 file per pengajuan.']);
        $this->assertDatabaseCount('documents', 5);
    }

    public function test_invalid_doc_type_422(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->upload(docType: 'PASPOR')->assertJsonValidationErrors('doc_type');
    }

    public function test_owner_can_download_200(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);
        $file = UploadedFile::fake()->image('ktp.jpg');
        $id = $this->upload($file)->assertCreated()->json('upload_id');

        $response = $this->get("/api/uploads/{$id}", $this->headers())
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->assertStringStartsWith('inline', $response->headers->get('Content-Disposition'));
        $this->assertSame(file_get_contents($file->getPathname()), $response->streamedContent());
    }

    public function test_other_application_403(): void
    {
        $document = Document::factory()->create();
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->getJson("/api/uploads/{$document->id}", $this->headers())->assertForbidden();
    }

    public function test_get_missing_header_400(): void
    {
        $document = Document::factory()->create();

        $this->getJson("/api/uploads/{$document->id}", $this->headers(id: null))->assertBadRequest();
    }

    public function test_unknown_upload_404(): void
    {
        Application::factory()->refer()->create(['application_id' => self::ID]);

        $this->getJson('/api/uploads/999', $this->headers())->assertNotFound();
    }
}

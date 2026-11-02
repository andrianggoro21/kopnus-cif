<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'upload_id' => $this->id,
            'file_name' => $this->file_name,
            'doc_type' => $this->doc_type,
            'status' => $this->status,
            'url' => "/api/uploads/{$this->id}",
        ];
    }
}

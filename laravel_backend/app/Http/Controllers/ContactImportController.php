<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportContactsRequest;
use App\Services\ContactImportService;
use Illuminate\Http\JsonResponse;

class ContactImportController extends Controller
{
    public function __construct(private ContactImportService $importer)
    {
    }

    public function import(ImportContactsRequest $request): JsonResponse
    {
        $mapping = $request->input('mapping');

        if (is_string($mapping)) {
            $decoded = json_decode($mapping, true);
            $mapping = is_array($decoded) ? $decoded : null;
        }

        $result = $this->importer->import($request->file('file'), $mapping);

        $status = 200;

        if (isset($result['message']) && $result['message'] === 'Invalid CSV format') {
            $status = 422;
        }

        return response()->json($result, $status);
    }
}
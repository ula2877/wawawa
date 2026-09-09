<?php

namespace App\Http\Controllers;

use App\Exceptions\InvalidTemplateVariableException;
use App\Http\Requests\StoreTemplateRequest;
use App\Http\Requests\UpdateTemplateRequest;
use App\Http\Resources\TemplateResource;
use App\Models\Template;
use App\Services\TemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    public function __construct(private TemplateService $templates)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $templates = $this->templates->list($request->query());

        return TemplateResource::collection($templates)->response();
    }

    public function meta(): JsonResponse
    {
        return response()->json([
            'categories' => config('template.categories'),
            'languages' => config('template.languages'),
            'variables' => TemplateService::ALLOWED_VARIABLES,
        ]);
    }

    public function store(StoreTemplateRequest $request): JsonResponse
    {
        try {
            $template = $this->templates->create($request->validated());
        } catch (InvalidTemplateVariableException $e) {
            return $this->invalidVariables($e);
        }

        return (new TemplateResource($template))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Template $template): JsonResponse
    {
        return (new TemplateResource($template))->response();
    }

    public function update(UpdateTemplateRequest $request, Template $template): JsonResponse
    {
        try {
            $template = $this->templates->update($template, $request->validated());
        } catch (InvalidTemplateVariableException $e) {
            return $this->invalidVariables($e);
        }

        return (new TemplateResource($template))->response();
    }

    public function destroy(Template $template): JsonResponse
    {
        $this->templates->delete($template);

        return response()->json(['message' => 'Template deleted successfully'], 204);
    }

    private function invalidVariables(InvalidTemplateVariableException $e): JsonResponse
    {
        $messages = collect($e->unknownVariables)
            ->map(fn (string $v) => "Unknown template variable: {{{$v}}}")
            ->values()
            ->all();

        return response()->json([
            'message' => $e->getMessage(),
            'errors' => [
                'content' => $messages,
            ],
        ], 422);
    }
}

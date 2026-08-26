<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Services\AiService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MessageController extends Controller
{
    public function storeAuto(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        if (trim($validated['message']) === '') {
            throw ValidationException::withMessages([
                'message' => ['The message cannot be empty.'],
            ]);
        }

        $conversation = $request->user()->conversations()->create();

        if ($request->boolean('stream', false)) {
            return $this->processMessageStream($request->user(), $conversation, $validated['message']);
        }

        return $this->processMessage($request->user(), $conversation, $validated['message']);
    }

    public function store(Request $request, Conversation $conversation)
    {
        abort_if($conversation->user_id !== $request->user()->id, 403, 'Unauthorized.');

        $validated = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        if ($request->boolean('stream', false)) {
            return $this->processMessageStream($request->user(), $conversation, $validated['message']);
        }

        return $this->processMessage($request->user(), $conversation, $validated['message']);
    }

    private function processMessageStream($user, Conversation $conversation, string $message)
    {
        if (trim($message) === '') {
            throw ValidationException::withMessages([
                'message' => ['The message cannot be empty.'],
            ]);
        }

        $conversation->messages()->create([
            'role' => 'user',
            'content' => $message,
        ]);

        $history = $this->buildHistory($conversation);

        $fullContent = '';
        $metadata = [];

        return response()->stream(function () use ($conversation, $history, &$fullContent, &$metadata) {
            app(AiService::class)->analyzeStream(
                $history,
                function ($meta) use (&$metadata) {
                    $metadata = $meta;
                    $this->sendSse('metadata', $meta);
                },
                function ($chunk) use (&$fullContent) {
                    $fullContent .= $chunk;
                    $this->sendSse('chunk', ['content' => $chunk]);
                },
                function ($result) use ($conversation, &$fullContent, &$metadata) {
                    $conversation->messages()->create([
                        'role' => 'assistant',
                        'content' => $fullContent,
                        'metadata' => $metadata,
                    ]);

                    $conversation->update([
                        'specialty' => $metadata['specialty'] ?? null,
                        'urgency' => $metadata['urgency'] ?? 'normal',
                        'is_complete' => ($metadata['conversation_complete'] ?? false) || ($metadata['urgency'] ?? 'normal') === 'urgent',
                    ]);

                    $this->sendSse('done', [
                        'conversation' => $conversation->fresh()->load('messages'),
                        'ai_response' => [
                            'message' => $fullContent,
                            'specialty' => $metadata['specialty'] ?? null,
                            'urgency' => $metadata['urgency'] ?? 'normal',
                            'conversation_complete' => $metadata['conversation_complete'] ?? false,
                            'follow_up_questions' => $metadata['follow_up_questions'] ?? [],
                        ],
                    ]);
                }
            );
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function processMessage($user, Conversation $conversation, string $message)
    {
        if (trim($message) === '') {
            throw ValidationException::withMessages([
                'message' => ['The message cannot be empty.'],
            ]);
        }

        $conversation->messages()->create([
            'role' => 'user',
            'content' => $message,
        ]);

        $history = $this->buildHistory($conversation);

        $aiResponse = app(AiService::class)->analyze($history);

        $conversation->messages()->create([
            'role' => 'assistant',
            'content' => $aiResponse['message'],
            'metadata' => [
                'specialty' => $aiResponse['specialty'],
                'urgency' => $aiResponse['urgency'],
                'conversation_complete' => $aiResponse['conversation_complete'],
                'follow_up_questions' => $aiResponse['follow_up_questions'],
            ],
        ]);

        $conversation->update([
            'specialty' => $aiResponse['specialty'],
            'urgency' => $aiResponse['urgency'],
            'is_complete' => $aiResponse['conversation_complete'] || $aiResponse['urgency'] === 'urgent',
        ]);

        return response()->json([
            'conversation' => $conversation->fresh()->load('messages'),
            'ai_response' => $aiResponse,
        ]);
    }

    private function buildHistory(Conversation $conversation): array
    {
        return $conversation->messages->map(fn ($message) => [
            'role' => $message->role,
            'content' => $message->content,
        ])->values()->toArray();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function sendSse(string $event, array $payload): void
    {
        echo 'data: '.json_encode(['event' => $event, 'payload' => $payload], JSON_UNESCAPED_UNICODE)."\n\n";
        ob_flush();
        flush();
    }
}
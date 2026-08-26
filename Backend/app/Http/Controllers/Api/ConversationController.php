<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $conversations = $request->user()->conversations()
            ->with('messages')
            ->get();

        return response()->json($conversations);
    }

    public function store(Request $request)
    {
        $conversation = $request->user()->conversations()->create();

        return response()->json($conversation->load('messages'), 201);
    }

    public function show(Request $request, Conversation $conversation)
    {
        $this->authorizeOwnership($request, $conversation);

        return response()->json($conversation->load('messages'));
    }

    public function destroy(Request $request, Conversation $conversation)
    {
        $this->authorizeOwnership($request, $conversation);
        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted.']);
    }

    private function authorizeOwnership(Request $request, Conversation $conversation): void
    {
        abort_if($conversation->user_id !== $request->user()->id, 403, 'Unauthorized.');
    }
}

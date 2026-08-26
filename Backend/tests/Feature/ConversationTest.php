<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ConversationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_user_can_create_conversation(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/conversations');

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'user_id', 'specialty', 'urgency', 'is_complete', 'messages']);
    }

    public function test_user_can_list_own_conversations(): void
    {
        $this->actingAs($this->user, 'sanctum')->postJson('/api/conversations');

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/conversations');

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_user_can_send_first_message_and_create_conversation(): void
    {
        $this->mockAiResponse([
            'message' => 'الألم بقاله قد إيه؟',
            'specialty' => null,
            'urgency' => 'normal',
            'conversation_complete' => false,
            'follow_up_questions' => ['الألم بقاله قد إيه؟'],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/messages', ['message' => 'عندي ألم في بطني']);

        $response->assertStatus(200)
            ->assertJsonPath('ai_response.specialty', null)
            ->assertJsonPath('ai_response.urgency', 'normal')
            ->assertJsonPath('conversation.is_complete', false)
            ->assertJsonPath('conversation.messages', fn ($messages) => count($messages) === 2);
    }

    public function test_empty_message_returns_validation_error(): void
    {
        $this->actingAs($this->user, 'sanctum')->postJson('/api/conversations');

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/messages', ['message' => '']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['message']);
    }

    public function test_red_flag_symptom_returns_urgent(): void
    {
        $this->mockAiResponse([
            'message' => 'الأعراض دي خطيرة، لازم تروح لأقرب مستشفى أو طوارئ دلوقتي.',
            'specialty' => 'cardiology',
            'urgency' => 'urgent',
            'conversation_complete' => true,
            'follow_up_questions' => [],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/messages', ['message' => 'ألم شديد في الصدر وضيق تنفس']);

        $response->assertStatus(200)
            ->assertJsonPath('ai_response.urgency', 'urgent')
            ->assertJsonPath('conversation.is_complete', true);
    }

    public function test_user_can_continue_existing_conversation(): void
    {
        $this->mockAiResponse([
            'message' => 'الألم بقاله قد إيه؟',
            'specialty' => null,
            'urgency' => 'normal',
            'conversation_complete' => false,
            'follow_up_questions' => ['الألم بقاله قد إيه؟'],
        ]);

        $conversationResponse = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/conversations');

        $conversationId = $conversationResponse->json('id');

        $this->mockAiResponse([
            'message' => 'يبدو إنك محتاج دكتور باطنة.',
            'specialty' => 'internal_medicine',
            'urgency' => 'normal',
            'conversation_complete' => true,
            'follow_up_questions' => [],
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/conversations/{$conversationId}/messages", [
                'message' => 'الألم بقاله يومين ومعاه إسهال',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('ai_response.specialty', 'internal_medicine')
            ->assertJsonPath('conversation.is_complete', true)
            ->assertJsonPath('conversation.messages', fn ($messages) => count($messages) === 2);
    }

    public function test_user_cannot_access_other_users_conversation(): void
    {
        $otherUser = User::factory()->create();
        $conversation = $otherUser->conversations()->create();

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/conversations/{$conversation->id}");

        $response->assertStatus(403);
    }

    private function mockAiResponse(array $response): void
    {
        $mock = Mockery::mock(AiService::class);
        $mock->shouldReceive('analyze')->andReturn($response);
        $this->app->instance(AiService::class, $mock);
    }
}

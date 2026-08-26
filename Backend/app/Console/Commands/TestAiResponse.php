<?php

namespace App\Console\Commands;

use App\Services\AiService;
use Illuminate\Console\Command;

class TestAiResponse extends Command
{
    protected $signature = 'app:test-ai {message=عندي ألم في الركبة بقاله أسبوع}';

    protected $description = 'Test AI response from Kimi + Luna pipeline';

    public function handle(): void
    {
        $this->info('Testing AI pipeline...');
        $this->info('Message: '.$this->argument('message'));
        $this->newLine();

        $history = [
            ['role' => 'user', 'content' => $this->argument('message')],
        ];

        $start = microtime(true);
        $result = app(AiService::class)->analyze($history);
        $duration = round((microtime(true) - $start) * 1000, 2);

        $this->info('Duration: '.$duration.'ms');
        $this->newLine();
        $this->info('AI Response:');
        $this->line($result['message']);
        $this->newLine();
        $this->info('Metadata:');
        $this->table(
            ['Key', 'Value'],
            [
                ['specialty', $result['specialty'] ?? 'null'],
                ['urgency', $result['urgency'] ?? 'normal'],
                ['conversation_complete', $result['conversation_complete'] ? 'true' : 'false'],
                ['follow_up_questions', implode(', ', $result['follow_up_questions'] ?? [])],
            ]
        );
    }
}

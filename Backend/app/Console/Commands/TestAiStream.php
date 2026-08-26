<?php

namespace App\Console\Commands;

use App\Services\AiService;
use Illuminate\Console\Command;

class TestAiStream extends Command
{
    protected $signature = 'app:test-ai-stream {message=عندي ألم في الركبة بقاله أسبوع}';

    protected $description = 'Test AI streaming response from Luna';

    public function handle(): void
    {
        $this->info('Testing AI streaming...');
        $this->newLine();

        $history = [
            ['role' => 'user', 'content' => $this->argument('message')],
        ];

        $start = microtime(true);
        $fullContent = '';

        app(AiService::class)->analyzeStream(
            $history,
            function ($metadata) {
                $this->info('Metadata: '.json_encode($metadata, JSON_UNESCAPED_UNICODE));
            },
            function ($chunk) use (&$fullContent) {
                $fullContent .= $chunk;
                echo $chunk;
            },
            function ($result) use (&$fullContent, $start) {
                $duration = round((microtime(true) - $start) * 1000, 2);
                $this->newLine(2);
                $this->info('Streaming finished in '.$duration.'ms');
                $this->info('Full content length: '.mb_strlen($fullContent));
                $this->info('Result: '.json_encode($result, JSON_UNESCAPED_UNICODE));
            }
        );
    }
}

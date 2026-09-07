<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use OpenAI;
use OpenAI\Contracts\ClientContract;
use RuntimeException;

class AiService
{
    private ClientContract $client;

    private string $kimiModel;

    private string $lunaModel;

    public function __construct()
    {
        $apiKey = config('services.kimi.api_key');
        $baseUrl = config('services.kimi.base_url');
        $this->kimiModel = config('services.kimi.model');
        $this->lunaModel = config('services.luna.model');

        if (! $apiKey) {
            throw new RuntimeException('KIMI_API_KEY is missing.');
        }

        $this->client = OpenAI::factory()
            ->withApiKey($apiKey)
            ->withBaseUri(rtrim($baseUrl, '/'))
            ->make();
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     */
    public function analyze(array $history): array
    {
        $extraction = $this->extractSymptoms($history);

        return $this->generateFinalResponse($history, $extraction);
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @param  callable(array<string, mixed>): void  $onMetadata
     * @param  callable(string): void  $onChunk
     * @param  callable(array<string, mixed>): void  $onComplete
     */
    public function analyzeStream(array $history, callable $onMetadata, callable $onChunk, callable $onComplete): void
    {
        $extraction = $this->extractSymptoms($history);
        $result = $this->generateFinalResponse($history, $extraction);

        $onMetadata([
            'specialty' => $result['specialty'],
            'urgency' => $result['urgency'],
            'conversation_complete' => $result['conversation_complete'],
            'follow_up_questions' => $result['follow_up_questions'],
        ]);

        $message = $result['message'];
        $words = preg_split('/\s+/u', $message, -1, PREG_SPLIT_NO_EMPTY);

        foreach ($words as $word) {
            $onChunk($word.' ');
            usleep(12000);
        }

        $onComplete($result);
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array<string, mixed>
     */
    private function extractSymptoms(array $history): array
    {
        $messages = [
            ['role' => 'system', 'content' => $this->model1Prompt()],
            ...$history,
        ];

        try {
            $response = $this->client->chat()->create([
                'model' => $this->kimiModel,
                'messages' => $messages,
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.2,
            ]);

            $content = $response->choices[0]->message->content ?? '';

            return $this->parseModel1Response($content);
        } catch (Exception $e) {
            Log::warning('Model 1 (Kimi) error: '.$e->getMessage().', retrying with flash-lite...');

            try {
                usleep(400000);
                $response = $this->client->chat()->create([
                    'model' => 'gemini-2.5-flash-lite',
                    'messages' => $messages,
                    'response_format' => ['type' => 'json_object'],
                    'temperature' => 0.2,
                ]);

                $content = $response->choices[0]->message->content ?? '';

                return $this->parseModel1Response($content);
            } catch (Exception $e2) {
                Log::error('Model 1 retry failed: '.$e2->getMessage());

                return $this->fallbackExtraction();
            }
        }
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @param  array<string, mixed>  $extraction
     * @return array{message: string, specialty: string|null, urgency: 'normal'|'urgent', conversation_complete: bool, follow_up_questions: string[]}
     */
    private function generateFinalResponse(array $history, array $extraction): array
    {
        $messages = [
            ['role' => 'system', 'content' => $this->model2Prompt()],
            ['role' => 'user', 'content' => $this->model2UserInput($history, $extraction)],
        ];

        try {
            $response = $this->client->chat()->create([
                'model' => $this->lunaModel,
                'messages' => $messages,
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.5,
            ]);

            $content = $response->choices[0]->message->content ?? '';

            return $this->parseModel2Response($content, $extraction);
        } catch (Exception $e) {
            Log::warning('Model 2 (Luna) error: '.$e->getMessage().', retrying with flash-lite...');

            try {
                usleep(400000);
                $response = $this->client->chat()->create([
                    'model' => 'gemini-2.5-flash-lite',
                    'messages' => $messages,
                    'response_format' => ['type' => 'json_object'],
                    'temperature' => 0.5,
                ]);

                $content = $response->choices[0]->message->content ?? '';

                return $this->parseModel2Response($content, $extraction);
            } catch (Exception $e2) {
                Log::error('Model 2 retry failed: '.$e2->getMessage());

                return $this->fallbackFromExtraction($extraction);
            }
        }
    }

    /**
     * @return array{message: string, specialty: string|null, urgency: 'normal'|'urgent', conversation_complete: bool, follow_up_questions: string[]}
     */
    private function specialtyMapping(string $department): array
    {
        $map = [
            'جراحة العظام' => ['specialty' => 'orthopedics', 'conversation_complete' => true],
            'الباطنة' => ['specialty' => 'internal_medicine', 'conversation_complete' => true],
            'الجلدية' => ['specialty' => 'dermatology', 'conversation_complete' => true],
            'العيون' => ['specialty' => 'ophthalmology', 'conversation_complete' => true],
            'القلب' => ['specialty' => 'cardiology', 'conversation_complete' => true],
            'المخ والأعصاب' => ['specialty' => 'neurology', 'conversation_complete' => true],
            'الأسنان' => ['specialty' => 'dentistry', 'conversation_complete' => true],
            'أنف وأذن وحنجرة' => ['specialty' => 'ent', 'conversation_complete' => true],
            'الأطفال' => ['specialty' => 'pediatrics', 'conversation_complete' => true],
            'النساء والتوليد' => ['specialty' => 'gynecology', 'conversation_complete' => true],
            'المسالك البولية' => ['specialty' => 'urology', 'conversation_complete' => true],
            'الجراحة العامة' => ['specialty' => 'general_surgery', 'conversation_complete' => true],
            'النفسية' => ['specialty' => 'psychiatry', 'conversation_complete' => true],
        ];

        return $map[$department] ?? ['specialty' => null, 'conversation_complete' => false];
    }

    private function model1Prompt(): string
    {
        return <<<'PROMPT'
You are a clinical symptom-extraction engine for a medical navigation app. Your job is to read the patient's conversation history (in Arabic) and extract structured medical data cumulatively from all user messages. You are NOT talking to the patient directly and your output is NEVER shown to them.

## Output contract
Respond with ONLY a single JSON object, no prose, no markdown fences, matching this schema:

{
  "symptoms": [
    { "raw_text_ar": "string", "normalized": "string", "onset": "string|null", "duration": "string|null", "severity": "mild|moderate|severe|unknown" }
  ],
  "patient_context": {
    "age_group": "infant|child|adolescent|adult|elderly|unknown",
    "gender": "male|female|unknown",
    "location": "string|unknown",
    "relevant_history": ["string"]
  },
  "possible_conditions": [
    { "condition_ar": "string", "condition_en": "string", "likelihood": "low|medium|high", "rationale": "string, 1 sentence" }
  ],
  "red_flags": {
    "present": true|false,
    "details": ["string"]
  },
  "clarification_needed": {
    "needed": true|false,
    "questions_ar": ["string"]
  },
  "is_off_topic": true|false,
  "confidence": "low|medium|high"
}

## Rules
1. Accumulate all symptoms and patient context mentioned across the entire conversation history. If the user confirms, says 'هما نفس الأعراض', or 'لا مفيش أعراض تاني', DO NOT wipe previously extracted symptoms — preserve everything mentioned earlier.
2. If the user's latest message is completely off-topic or unrelated to health/medical matters (e.g. general trivia like 'أطول برج في العالم', greetings, banter), set is_off_topic = true.
3. If enough symptoms or clinical context have already been gathered across the conversation to reasonably recommend a medical specialty, set clarification_needed.needed = false.
4. Red flags — always check for and flag emergency indicators: sudden chest pain w/ shortness of breath, signs of stroke, severe uncontrolled bleeding, difficulty breathing, loss of consciousness, suspected poisoning, severe trauma. If any are present, set red_flags.present = true.
5. Never output anything outside the JSON object.
PROMPT;
    }

    /**
     * @return array<string, mixed>
     */
    private function parseModel1Response(string $content): array
    {
        $clean = trim($content);
        if (preg_match('/\{[\s\S]*\}/', $clean, $matches)) {
            $clean = $matches[0];
        }

        $decoded = json_decode($clean, true);

        if (! is_array($decoded)) {
            Log::warning('Model 1 JSON decode failed. Content: '.substr($content, 0, 500));

            return $this->fallbackExtraction();
        }

        return [
            'symptoms' => $decoded['symptoms'] ?? [],
            'patient_context' => $decoded['patient_context'] ?? ['age_group' => 'unknown', 'gender' => 'unknown', 'location' => 'unknown', 'relevant_history' => []],
            'possible_conditions' => $decoded['possible_conditions'] ?? [],
            'red_flags' => $decoded['red_flags'] ?? ['present' => false, 'details' => []],
            'clarification_needed' => $decoded['clarification_needed'] ?? ['needed' => false, 'questions_ar' => []],
            'is_off_topic' => (bool) ($decoded['is_off_topic'] ?? false),
            'confidence' => $decoded['confidence'] ?? 'low',
        ];
    }

    private function fallbackExtraction(): array
    {
        return [
            'symptoms' => [],
            'patient_context' => ['age_group' => 'unknown', 'gender' => 'unknown', 'location' => 'unknown', 'relevant_history' => []],
            'possible_conditions' => [],
            'red_flags' => ['present' => false, 'details' => []],
            'clarification_needed' => ['needed' => false, 'questions_ar' => []],
            'is_off_topic' => false,
            'confidence' => 'low',
        ];
    }

    private function model2Prompt(): string
    {
        return <<<'PROMPT'
أنت "صحتك AI"، مساعد ذكي وودود للتوجيه الطبي بيتكلم بالمصري البسيط السلس. مهمتك مساعدة المستخدم في توجيهه للعيادة أو التخصص الطبي المناسب بناءً على المحادثة كاملة. أنت مش دكتور ومش بتشخص أمراض محددة أو تكتب علاج.

## قواعد التعامل:
1. **لو كلام المستخدم مش طبي (Off-topic)**: زي أسئلة عامة (مثلاً: "إيه أطول برج في العالم")، رد بذوق وبساطة إنك مساعد طبي مخصص لتوجيه المرضى واستفساراتهم الصحية، واسأله لو عنده أي أعراض أو استفسار طبي حابب تساعده فيه. (department = null, conversation_complete = false).
2. **سلاسة المحادثة وعدم التكرار**:
   - لو المستخدم قال "هما نفس الأعراض" أو "مفيش أعراض تانية" أو كرر كلامه، إياك تسأله تاني عن الأعراض! اعتمد فوراً على الأعراض اللي قالها في أول المحادثة ورشح له التخصص المناسب.
   - متكررش نفس السؤال مرتين أبداً في نفس المحادثة.
3. **الطوارئ**: لو فيه red_flags أو ألم شديد في الصدر أو ضيق تنفس حاد، وجهه فوراً وبدون تأخير لأقرب طوارئ أو مستشفى. (urgency = "urgent", conversation_complete = true).
4. **التوجيه للتخصص**: لما تتوفر معلومات كافية، رشح قسم واحد مناسب من الأقسام التالية:
   [جراحة العظام، الباطنة، الجلدية، العيون، القلب، المخ والأعصاب، الأسنان، أنف وأذن وحنجرة، الأطفال، النساء والتوليد، المسالك البولية، الجراحة العامة، النفسية].
5. **اقتراح العيادات**: لما ترشح تخصص ويكون عندك اسم المدينة أو المنطقة، ضيف في آخر الرسالة:
   "ممكن تدور على دكاترة [القسم] قريب منك من هنا: https://www.google.com/maps/search/دكتور+[القسم]+في+[المدينة/المنطقة]"
6. **الأسلوب**:
   - الكلام مصري طبيعي وسلس ومريح للمريض، مش روبوتي.
   - لو محتاج تسأل، اسأل سؤال واحد بس وواضح وبلاش أسئلة كتير ورا بعض.
   - متكتبش تشخيص قاطع لمرض ولا تكتب أسماء أدوية.

## صيغة الرد
Respond with ONLY a JSON object:
{
  "message": "string (الرسالة بالعربي المصرية الطبيعية)",
  "department": "string أو null",
  "urgency": "normal" أو "urgent",
  "conversation_complete": true أو false,
  "follow_up_questions": ["string"]
}
PROMPT;
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @param  array<string, mixed>  $extraction
     */
    private function model2UserInput(array $history, array $extraction): string
    {
        $lastUserMessage = collect($history)
            ->where('role', 'user')
            ->last()['content'] ?? 'رسالة المستخدم';

        $fullConversation = collect($history)
            ->map(fn ($message) => ($message['role'] === 'user' ? 'المستخدم: ' : 'المساعد: ').$message['content'])
            ->implode("\n");

        $context = json_encode([
            'last_user_message' => $lastUserMessage,
            'full_conversation' => $fullConversation,
            'structured_analysis' => $extraction,
        ], JSON_UNESCAPED_UNICODE);

        return "حدد التخصص المناسب واكتب الرد للمستخدم بناءً على المحادثة كاملة والتحليل ده:\n{$context}";
    }

    /**
     * @param  array<string, mixed>  $extraction
     * @return array{message: string, specialty: string|null, urgency: 'normal'|'urgent', conversation_complete: bool, follow_up_questions: string[]}
     */
    private function parseModel2Response(string $content, array $extraction): array
    {
        $clean = trim($content);
        if (preg_match('/\{[\s\S]*\}/', $clean, $matches)) {
            $clean = $matches[0];
        }

        $decoded = json_decode($clean, true);

        if (! is_array($decoded)) {
            Log::warning('Model 2 JSON decode failed. Content: '.substr($content, 0, 500));

            return $this->fallbackFromExtraction($extraction);
        }

        $urgency = in_array($decoded['urgency'] ?? '', ['normal', 'urgent'], true)
            ? $decoded['urgency']
            : (($extraction['red_flags']['present'] ?? false) ? 'urgent' : 'normal');

        $conversationComplete = (bool) ($decoded['conversation_complete'] ?? false);
        $followUpQuestions = is_array($decoded['follow_up_questions'] ?? null)
            ? $decoded['follow_up_questions']
            : [];

        $mapping = $this->specialtyMapping($decoded['department'] ?? '');

        return [
            'message' => $decoded['message'] ?: $this->fallbackFromExtraction($extraction)['message'],
            'specialty' => $mapping['specialty'],
            'urgency' => $urgency,
            'conversation_complete' => $conversationComplete || $urgency === 'urgent',
            'follow_up_questions' => $followUpQuestions,
        ];
    }

    /**
     * @param  array<string, mixed>  $extraction
     * @return array{message: string, specialty: string|null, urgency: 'normal'|'urgent', conversation_complete: bool, follow_up_questions: string[]}
     */
    private function fallbackFromExtraction(array $extraction): array
    {
        if ($extraction['red_flags']['present'] ?? false) {
            return [
                'message' => 'الأعراض دي ممكن تكون طارئة ومحتاجة فحص فوري. لو حالتك بتتطور بسرعة، توجه لأقرب مستشفى أو اتصل بالطوارئ دلوقتي.',
                'specialty' => null,
                'urgency' => 'urgent',
                'conversation_complete' => true,
                'follow_up_questions' => [],
            ];
        }

        if (! empty($extraction['possible_conditions'])) {
            return [
                'message' => 'سلامتك ألف سلامة. بناءً على الأعراض اللي وضحتها، الأنسب فحص حالتك عند طبيب باطنة أو ممارس عام للتأكد من سلامتك.',
                'specialty' => 'internal_medicine',
                'urgency' => 'normal',
                'conversation_complete' => true,
                'follow_up_questions' => [],
            ];
        }

        if (! empty($extraction['clarification_needed']['questions_ar'])) {
            $questions = $extraction['clarification_needed']['questions_ar'];
            return [
                'message' => $questions[0],
                'specialty' => null,
                'urgency' => 'normal',
                'conversation_complete' => false,
                'follow_up_questions' => $questions,
            ];
        }

        return [
            'message' => 'أنا مساعدك الطبي الذكي لتوجيهك للقسم والعيادة المناسبة. لو عندك أي أعراض أو استفسار صحي تحب نشاركه، قولي وأنا معاك.',
            'specialty' => null,
            'urgency' => 'normal',
            'conversation_complete' => false,
            'follow_up_questions' => [],
        ];
    }
}

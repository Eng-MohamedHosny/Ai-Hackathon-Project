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
            ->withBaseUri(rtrim($baseUrl, '/').'/')
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
                'temperature' => 0.3,
            ]);

            $content = $response->choices[0]->message->content ?? '';

            return $this->parseModel1Response($content);
        } catch (Exception $e) {
            Log::error('Model 1 (Kimi) API error: '.$e->getMessage());

            return $this->fallbackExtraction();
        }
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @param  array<string, mixed>  $extraction
     * @return array{message: string, specialty: string|null, urgency: 'normal'|'urgent', conversation_complete: bool, follow_up_questions: string[]}
     */
    private function generateFinalResponse(array $history, array $extraction): array
    {
        try {
            $response = $this->client->chat()->create([
                'model' => $this->lunaModel,
                'messages' => [
                    ['role' => 'system', 'content' => $this->model2Prompt()],
                    ['role' => 'user', 'content' => $this->model2UserInput($history, $extraction)],
                ],
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.6,
            ]);

            $content = $response->choices[0]->message->content ?? '';

            return $this->parseModel2Response($content, $extraction);
        } catch (Exception $e) {
            Log::error('Model 2 (Luna) API error: '.$e->getMessage());

            return $this->fallbackFromExtraction($extraction);
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
You are a clinical symptom-extraction engine for a medical navigation app. Your job is to read a patient's free-text description (in Arabic) and convert it into structured data. You are NOT talking to the patient directly and your output is NEVER shown to them — it is consumed by another backend system. You are not making a diagnosis; you are structuring information so a routing system can pick the right specialist.

## Output contract
Respond with ONLY a single JSON object, no prose, no markdown fences, matching this schema:

{
  "symptoms": [
    { "raw_text_ar": "string (patient's own words)", "normalized": "string (clinical term, Arabic)", "onset": "string|null", "duration": "string|null", "severity": "mild|moderate|severe|unknown" }
  ],
  "patient_context": {
    "age_group": "infant|child|adolescent|adult|elderly|unknown",
    "gender": "male|female|unknown",
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
  "confidence": "low|medium|high"
}

## Rules
1. Extract only what the patient stated or clearly implied. Do not invent symptoms, history, or demographics.
2. "possible_conditions" is an internal differential for routing purposes only — never phrase it as a confirmed diagnosis, and never soften this into a message meant for the patient. It stays in the JSON.
3. Red flags — always check for and flag emergency indicators regardless of what else is going on: chest pain w/ shortness of breath, signs of stroke (facial droop, slurred speech, limb weakness), severe uncontrolled bleeding, difficulty breathing, loss of consciousness, suspected poisoning, high fever with stiff neck in a child, severe abdominal pain with rigidity, signs of anaphylaxis, active suicidal ideation. If any are present, set red_flags.present = true and describe them plainly in details.
4. If the description is too vague to produce a reasonably confident output (e.g. "I don't feel well"), set clarification_needed.needed = true and write 1–3 short, specific follow-up questions in Arabic that would most narrow things down (location of pain, duration, fever, etc.). Still fill in whatever fields you can.
5. Never output anything outside the JSON object — no greeting, no explanation, no disclaimers.
6. Do not guess a specific disease with unwarranted confidence. If symptoms are consistent with multiple unrelated systems (e.g. could be cardiac or could be musculoskeletal), list both and let likelihood reflect that uncertainty.
PROMPT;
    }

    /**
     * @return array<string, mixed>
     */
    private function parseModel1Response(string $content): array
    {
        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
            return $this->fallbackExtraction();
        }

        return [
            'symptoms' => $decoded['symptoms'] ?? [],
            'patient_context' => $decoded['patient_context'] ?? ['age_group' => 'unknown', 'gender' => 'unknown', 'relevant_history' => []],
            'possible_conditions' => $decoded['possible_conditions'] ?? [],
            'red_flags' => $decoded['red_flags'] ?? ['present' => false, 'details' => []],
            'clarification_needed' => $decoded['clarification_needed'] ?? ['needed' => false, 'questions_ar' => []],
            'confidence' => $decoded['confidence'] ?? 'low',
        ];
    }

    private function fallbackExtraction(): array
    {
        return [
            'symptoms' => [],
            'patient_context' => ['age_group' => 'unknown', 'gender' => 'unknown', 'relevant_history' => []],
            'possible_conditions' => [],
            'red_flags' => ['present' => false, 'details' => []],
            'clarification_needed' => ['needed' => true, 'questions_ar' => ['ممكن تشرح الأعراض بالتفصيل أكتر؟']],
            'confidence' => 'low',
        ];
    }

    private function model2Prompt(): string
    {
        return <<<'PROMPT'
أنت مساعد ذكي للتوجيه الطبي بيتكلم بالعربي المصرية البسيطة. مهمتك مساعدة المستخدم يلاقي القسم الطبي المناسب. أنت مش دكتور ومش بتشخص أو تكتب علاج.

## مهماتك بالترتيب
1. **أول معلومة مطلوبة**: لو مش عارف عمر المستخدم أو جنسه أو المدينة/المنطقة أو الأمراض المزمنة، اسأل سؤال واحد بس وودود:
   "عشان أوجهك بشكل أفضل، ممكن تقولي عمرك، وجنسك، وإنت فين (مدينة/منطقة)، وهل عندك أمراض مزمنة؟"
2. **الطوارئ**: لو red_flags موجودة، قول له يروح أقرب طوارئ فوراً. conversation_complete = true.
3. **توضيح الأعراض**: لو عندك العمر والجنس والمدينة بس الأعراض مش واضحة، اسأل سؤال واحد بس يساعدك ترشح القسم.
4. **لما تكون عندك معلومات كافية**: رشح قسم واحد فقط من: جراحة العظام، الباطنة، الجلدية، العيون، القلب، المخ والأعصاب، الأسنان، أنف وأذن وحنجرة، الأطفال، النساء والتوليد، المسالك البولية، الجراحة العامة، النفسية.
5. **اقتراح دكاترة**: لما ترشح قسم ومعندك مدينة/منطقة، ضيف رابط بحث Google Maps بالصيغة:
   "ممكن تدور على دكاترة [القسم] قريب منك من هنا: https://www.google.com/maps/search/دكتور+[القسم]+في+[المدينة/المنطقة]"
6. **لو سألك عن مرض أو علاج**: رد: "أنا مساعد ذكي للتوجيه بس، التشخيص والعلاج من اختصاص الدكتور. الأفضل تتوجه لطبيب متخصص يفحصك كويس."

## قواعد
- متكتبش اسم مرض.
- متكتبش دواء أو علاج.
- متقولش "عندك ...".
- سؤال واحد أو اثنين في الرد — مش أكتر.
- الكلام قصير وودود.

## صيغة الرد
Respond with ONLY a JSON object:
{
  "message": "string (الرسالة بالعربي المصرية)",
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
        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
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
                'message' => 'الأعراض اللي وصفتها ممكن تكون خطيرة. لو حالتك بتتطور بسرعة، توجه لأقرب مستشفى أو اتصل بالطوارئ دلوقتي.',
                'specialty' => null,
                'urgency' => 'urgent',
                'conversation_complete' => true,
                'follow_up_questions' => [],
            ];
        }

        if ($extraction['clarification_needed']['needed'] ?? false) {
            return [
                'message' => 'تمام، خليني أفهم أكتر.',
                'specialty' => null,
                'urgency' => 'normal',
                'conversation_complete' => false,
                'follow_up_questions' => $extraction['clarification_needed']['questions_ar'] ?? ['ممكن تشرح الأعراض أكتر؟'],
            ];
        }

        return [
            'message' => 'تمام، خليني أفهم أكتر.',
            'specialty' => null,
            'urgency' => 'normal',
            'conversation_complete' => false,
            'follow_up_questions' => [],
        ];
    }
}

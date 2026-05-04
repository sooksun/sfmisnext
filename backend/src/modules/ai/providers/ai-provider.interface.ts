/** ข้อความแชทสำหรับ AI */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** ผลลัพธ์จาก AI */
export interface AiResponse {
  content: string;
  provider: 'gemini' | 'ollama' | 'openrouter';
  model: string;
  tokensUsed?: number;
}

/** Tool/Function definition สำหรับ function calling */
export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** ผลลัพธ์ function call จาก AI */
export interface AiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

/** Interface หลักสำหรับ AI Provider */
export interface AiProvider {
  /** ชื่อ provider */
  readonly name: 'gemini' | 'ollama' | 'openrouter';

  /** ส่งข้อความและรับ response ทั้งหมดกลับมา */
  chat(
    messages: ChatMessage[],
    systemPrompt: string,
    tools?: AiTool[],
  ): Promise<AiResponse>;

  /** ส่งข้อความและรับ response แบบ streaming */
  chatStream(
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncGenerator<string>;

  /** ตรวจสอบว่า provider พร้อมใช้งานหรือไม่ */
  isAvailable(): Promise<boolean>;
}

/** ระดับความซับซ้อนของงาน AI */
export type AiTaskComplexity = 'simple' | 'complex';

/** ประเภทงาน AI */
export type AiTaskType = 'chat' | 'validate' | 'analyze' | 'merge' | 'classify';

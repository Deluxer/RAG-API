export type MessageType = "user" | "assistant" | "system" | "memory";

export interface MessageContent {
    content: string;
    role: MessageType;
    options?: Record<string, any>;
}

export interface ChatMessage {
    id: string;
    messages: MessageContent[];
}
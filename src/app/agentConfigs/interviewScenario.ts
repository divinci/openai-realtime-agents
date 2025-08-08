import {
  RealtimeAgent,
  tool,
} from '@openai/agents/realtime';

export const handoverToInterviewer = tool({
  name: 'handover_to_interviewer',
  description: 'Hand over the conversation to the interviewer agent when user is ready to start',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Reason for the handover'
      }
    },
    required: ['reason'],
    additionalProperties: false,
  },
  execute: async (input: any) => {
    return { success: true, message: 'Handover initiated' };
  },
});

export const endSession = tool({
  name: 'end_session',
  description: 'End the interview session',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Reason for ending the session'
      }
    },
    required: ['reason'],
    additionalProperties: false,
  },
  execute: async (input: any, details: any) => {
    const context = details?.context as any;
    if (context?.disconnect) {
      context.disconnect();
    }
    return { success: true, message: 'Session ended' };
  },
});

export const interviewerAgent = new RealtimeAgent({
  name: 'interviewer',
  voice: 'alloy',
  instructions: `You are a warm, professional interviewer for Disney hiring a Runner.

Start with a short ice-breaker: "Hi there! How was your journey getting here?" or similar.

After the user responds to your ice-breaker (one user turn), ask: "Why should we give you the job as a Runner at Disney?"

When the user finishes answering this question, thank them warmly and end the session using the end_session tool.

Keep responses conversational and professional. Be encouraging and positive.

If the user goes off-topic during the interview, gently redirect them back to the question: "That's interesting, but let's focus on the interview question: Why should we give you the job as a Runner at Disney?"

Stay professional and encouraging throughout the interaction.`,
  handoffs: [],
  tools: [endSession],
  handoffDescription: 'Professional interviewer who conducts the main interview question',
});

export const welcomerAgent = new RealtimeAgent({
  name: 'welcomer',
  voice: 'sage',
  instructions: `You are a friendly greeter for an employability module.

Explain to the user: "Welcome! This will be an informal interview - no materials needed, it should be quite short, and we'll focus on your background rather than technical questions."

Then ask: "Any questions before I hand you to my colleague to begin?"

If the user has questions: answer them briefly and helpfully. After answering, if they seem satisfied, ask if they're ready to start.

If the user says any of these: "no questions", "start", "begin", "ready", "go", "let's start", or similar - immediately use the handover_to_interviewer tool.

If the user asks multiple questions, answer up to 2 clarification rounds, then ask "Ready to start?" and handover when they confirm.

Keep all replies to 2 sentences or less unless answering a specific question.

Be warm, friendly, and encouraging.

If the user is silent for more than 10 seconds, say "Are you still there? Do you have any questions, or are you ready to start?"

If the user goes off-topic or uses inappropriate language, politely redirect: "Let's focus on getting you ready for the interview. Do you have any questions about the process, or shall we begin?"

If the user continues to be off-topic after one redirect, use handover_to_interviewer to proceed with the interview.`,
  handoffs: [interviewerAgent],
  tools: [handoverToInterviewer],
  handoffDescription: 'Friendly greeter who welcomes users and handles pre-interview questions',
});

export const interviewScenario = [welcomerAgent, interviewerAgent];

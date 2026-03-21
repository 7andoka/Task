import { GoogleGenAI } from "@google/genai";
import { Task, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getTaskInsights(tasks: Task[], user: UserProfile, lang: 'ar' | 'en') {
  const model = "gemini-3-flash-preview";
  const taskSummary = tasks.map(t => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    deadline: t.deadline,
    progress: t.progress,
    assigneeId: t.assigneeId
  }));

  const prompt = `
    As an expert enterprise workforce analyst, analyze the following tasks for ${user.displayName} (${user.role}).
    Tasks: ${JSON.stringify(taskSummary)}
    
    Provide insights in ${lang === 'ar' ? 'Arabic' : 'English'} on:
    1. Predicted task delays based on deadlines and current progress.
    2. Workload balancing recommendations.
    3. High-level productivity summary.
    4. Suggestions for optimal task assignments.
    
    Keep the response concise and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return lang === 'ar' ? "فشل في الحصول على رؤى الذكاء الاصطناعي." : "Failed to get AI insights.";
  }
}

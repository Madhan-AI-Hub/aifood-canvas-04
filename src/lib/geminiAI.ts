// Gemini AI Integration for Food Analysis and Nutrition Advice
// Phase 8: AI Chatbot Enhancement

import { UserProfile } from '@/contexts/ProfileContext';

export interface FoodAnalysisResult {
  foodName: string;
  confidence: number;
  nutrition: {
    calories: number;
    carbs: number; // in grams
    proteins: number; // in grams
    fats: number; // in grams
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  portionSize: {
    estimated: string; // "1 medium apple", "200g rice", etc.
    grams: number;
  };
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  suggestions: string[];
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  actionType?: 'food_analysis' | 'nutrition_advice' | 'meal_suggestion' | 'progress_analysis';
  data?: Record<string, unknown>;
}

interface NutritionData {
  daily_calories?: number;
  daily_carbs?: number;
  daily_proteins?: number;
  daily_fats?: number;
  consumed_calories?: number;
  consumed_carbs?: number;
  consumed_proteins?: number;
  consumed_fats?: number;
  progress_percentage?: number;
}

interface ActivityData {
  steps?: number;
  active_minutes?: number;
  calories_burned?: number;
  exercise_sessions?: Array<{
    exercise_type: string;
    duration_minutes: number;
    calories_burned: number;
  }>;
}

interface GeminiRequestBody {
  contents: Array<{
    parts: Array<{
      text?: string;
      inline_data?: {
        mime_type: string;
        data: string;
      };
    }>;
  }>;
  generationConfig: {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
  };
  safetySettings: Array<{
    category: string;
    threshold: string;
  }>;
}

class GeminiAIService {
  private apiKey: string;
  

  constructor() {
    // In a production app, use environment variables
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your environment variables.');
    }
  }

  // Use v1 endpoint by default (newer models are generally published under v1)
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1';

  // Prioritized list of models to try when a particular model/method is unavailable
  private modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.1',
    'gemini-1.5-flash',
    'gemini-1.5',
    'text-bison-001'
  ];

  // Methods/endpoints to try for each model (some models support different RPC names)
  private modelMethods = ['generateContent', 'generateText', 'generate'];

  // Convert image file to base64 for Gemini API
  private async imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Get MIME type from file
  private getMimeType(file: File): string {
    return file.type;
  }

  // Generate AI response using Gemini
  private async generateContent(prompt: string, imageData?: { data: string; mimeType: string }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const requestBody: GeminiRequestBody = {
      contents: [{
        parts: [
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Add image data if provided
    if (imageData) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: imageData.mimeType,
          data: imageData.data
        }
      });
    }

    // Discover available models first (best-effort) and prefer ones that exist
    let availableModels: string[] = [];
    try {
      const list = await this.listModels();
      availableModels = list;
    } catch (listErr) {
      // If listing fails, we'll still try the prioritized list below
      console.warn('Failed to list Gemini models, proceeding with prioritized list', listErr);
    }

    const candidates = availableModels.length > 0
      ? this.modelsToTry.filter(m => availableModels.includes(m))
      : this.modelsToTry;

    // Try prioritized models and method names
    const tried: Array<{ model: string; method: string; status?: number; message?: string }> = [];

    for (const model of candidates) {
      for (const method of this.modelMethods) {
        const url = `${this.baseUrl}/models/${model}:${method}?key=${this.apiKey}`;
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || `HTTP ${response.status}`;
            tried.push({ model, method, status: response.status, message });

            // If model/method not found (404) or unsupported method (400/404), try next
            if (response.status === 404 || response.status === 400) {
              // continue to next method/model
              continue;
            }

            // For other errors, surface a helpful message
            throw new Error(`Gemini API error: ${response.status} - ${message}`);
          }

          // Successful response
          const data = await response.json();

          // Older/newer APIs may return text in different shapes, try common accessors
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.output?.[0]?.content || data?.text || data?.responseText;

          if (typeof candidateText === 'string' && candidateText.trim().length > 0) {
            return candidateText;
          }

          // If format unexpected, add to tried and continue
          tried.push({ model, method, status: 200, message: 'Unexpected response format' });
          continue;
        } catch (err) {
          // network or parsing error - record and continue
          tried.push({ model, method, message: err instanceof Error ? err.message : String(err) });
          continue;
        }
      }
    }

    // If we reach here, none of the models/methods worked
    const attempts = tried.map(t => `${t.model}:${t.method} => ${t.status ?? 'err'} ${t.message ?? ''}`).join('; ');
    console.error('Gemini API model attempts:', attempts);
    throw new Error(`Gemini API model/method not available. Tried: ${attempts}`);
  }

  // List available models (best-effort). Returns simple model ids like 'gemini-2.5-flash'
  async listModels(): Promise<string[]> {
    if (!this.apiKey) throw new Error('Gemini API key not configured');
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Failed to list models: ${res.status} ${err?.error?.message || ''}`);
      }
      const data = await res.json();
      // Response shape: { models: [{ name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' }, ...] }
      if (!Array.isArray(data.models)) return [];
      return data.models.map((m: unknown) => {
        // name may be 'models/gemini-2.5-flash' or just the id
        const obj = m as Record<string, unknown>;
        const nameVal = obj?.name ?? obj?.model ?? obj?.id ?? '';
        return String(nameVal).replace(/^models\//, '');
      }).filter(Boolean);
    } catch (error) {
      console.warn('listModels error:', error);
      return [];
    }
  }

  // Analyze food image and extract nutrition data
  async analyzeFoodImage(imageFile: File): Promise<FoodAnalysisResult> {
    try {
      const base64Data = await this.imageToBase64(imageFile);
      const mimeType = this.getMimeType(imageFile);

      const prompt = `Analyze this food image and provide detailed nutritional information. Please respond with ONLY a valid JSON object in this exact format:

{
  "foodName": "specific food name",
  "confidence": 0.95,
  "nutrition": {
    "calories": 250,
    "carbs": 45,
    "proteins": 12,
    "fats": 8,
    "fiber": 5,
    "sugar": 10,
    "sodium": 300
  },
  "portionSize": {
    "estimated": "1 medium serving",
    "grams": 200
  },
  "mealType": "lunch",
  "suggestions": ["Consider adding vegetables for more nutrients", "Good source of protein"]
}

Rules:
1. Identify the main food item(s) in the image
2. Estimate portion size based on visual cues
3. Provide nutritional values per 100g and scale to estimated portion
4. Suggest appropriate meal type (breakfast/lunch/dinner/snack)
5. Give 2-3 helpful suggestions
6. Use confidence score 0.1-1.0 based on image clarity
7. Return ONLY valid JSON, no additional text`;

      const response = await this.generateContent(prompt, {
        data: base64Data,
        mimeType: mimeType
      });

      // Parse the JSON response
      try {
        const analysisResult = JSON.parse(response.trim());
        return analysisResult as FoodAnalysisResult;
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', response);
        throw new Error('Invalid JSON response from AI');
      }
    } catch (error) {
      console.error('Food analysis error:', error);
      throw new Error(`Failed to analyze food image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate nutrition advice based on user profile and context
  async getNutritionAdvice(
    userProfile: UserProfile | null, 
    userMessage: string, 
    nutritionData?: NutritionData,
    activityData?: ActivityData
  ): Promise<ChatResponse> {
    try {
      const userType = userProfile?.user_type || 'general';
      const userGoals = this.getUserGoals(userType);
      
      let contextInfo = '';
      if (nutritionData) {
        contextInfo += `Current nutrition status: ${JSON.stringify(nutritionData)} `;
      }
      if (activityData) {
        contextInfo += `Recent activity: ${JSON.stringify(activityData)} `;
      }

      const prompt = `You are an expert nutrition AI assistant specialized in helping ${userType} users. 

User Profile:
- Type: ${userType}
- Age: ${userProfile?.age || 'unknown'}
- Gender: ${userProfile?.gender || 'unknown'}
- Height: ${userProfile?.height || 'unknown'}cm
- Weight: ${userProfile?.weight || 'unknown'}kg
- Goals: ${userGoals}

Context: ${contextInfo}

User Question: "${userMessage}"

Provide helpful, personalized nutrition advice based on their specific user type and goals. 
${userType === 'diabetes' ? 'Focus on blood sugar management, low glycemic foods, and carb counting.' : ''}
${userType === 'gym' ? 'Focus on protein intake, pre/post workout nutrition, and muscle building/recovery.' : ''}

Respond in a friendly, encouraging tone with specific, actionable advice. Keep responses concise (2-3 paragraphs max).

Also suggest 2-3 quick follow-up questions the user might ask.

Format your response as JSON:
{
  "message": "Your detailed response here...",
  "suggestions": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"],
  "actionType": "nutrition_advice"
}`;

      const response = await this.generateContent(prompt);
      
      try {
        return JSON.parse(response.trim()) as ChatResponse;
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          message: response,
          suggestions: ["Tell me more", "Any other tips?", "What about meal timing?"],
          actionType: 'nutrition_advice'
        };
      }
    } catch (error) {
      console.error('Nutrition advice error:', error);
      throw new Error(`Failed to generate nutrition advice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate meal suggestions based on user preferences and goals
  async getMealSuggestions(
    userProfile: UserProfile | null,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    preferences?: string[]
  ): Promise<ChatResponse> {
    try {
      const userType = userProfile?.user_type || 'general';
      const userGoals = this.getUserGoals(userType);
      
      const prompt = `Generate ${mealType} suggestions for a ${userType} user.

User Profile:
- Type: ${userType} 
- Goals: ${userGoals}
- Preferences: ${preferences?.join(', ') || 'none specified'}

Requirements:
${userType === 'diabetes' ? '- Low glycemic index foods\n- Balanced carb content\n- Focus on fiber' : ''}
${userType === 'gym' ? '- High protein options\n- Pre/post workout timing\n- Muscle building nutrients' : ''}

Provide 3-4 specific meal ideas with:
1. Brief description
2. Estimated calories and macros
3. Preparation time
4. Why it's good for their goals

Format as JSON:
{
  "message": "Here are some great ${mealType} options for you:\\n\\n[detailed meal suggestions]",
  "suggestions": ["Get recipe for meal 1", "Nutrition breakdown", "More ${mealType} ideas"],
  "actionType": "meal_suggestion"
}`;

      const response = await this.generateContent(prompt);
      
      try {
        return JSON.parse(response.trim()) as ChatResponse;
      } catch (parseError) {
        return {
          message: response,
          suggestions: ["Get recipe details", "More meal ideas", "Nutrition information"],
          actionType: 'meal_suggestion'
        };
      }
    } catch (error) {
      console.error('Meal suggestions error:', error);
      throw new Error(`Failed to generate meal suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analyze user's nutrition progress and provide insights
  async analyzeProgress(
    userProfile: UserProfile | null,
    nutritionData: NutritionData,
    activityData?: ActivityData,
    timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<ChatResponse> {
    try {
      const userType = userProfile?.user_type || 'general';

      const prompt = `Analyze the nutrition and activity progress for a ${userType} user over the ${timeframe} period.

User Data:
- Nutrition: ${JSON.stringify(nutritionData)}
- Activity: ${JSON.stringify(activityData || {})}

Provide:
1. Progress assessment (positive achievements)
2. Areas for improvement
3. Specific recommendations
4. Motivational insights
5. Next week's focus areas

${userType === 'diabetes' ? 'Pay special attention to blood sugar management patterns and carb consistency.' : ''}
${userType === 'gym' ? 'Focus on protein intake adequacy, workout nutrition timing, and recovery.' : ''}

Be encouraging and constructive. Format as JSON:
{
  "message": "Your detailed progress analysis...",
  "suggestions": ["Set new goal", "Adjust nutrition plan", "Track specific metric"],
  "actionType": "progress_analysis"
}`;

      const response = await this.generateContent(prompt);
      
      try {
        return JSON.parse(response.trim()) as ChatResponse;
      } catch (parseError) {
        return {
          message: response,
          suggestions: ["Set weekly goals", "Track progress", "Get recommendations"],
          actionType: 'progress_analysis'
        };
      }
    } catch (error) {
      console.error('Progress analysis error:', error);
      throw new Error(`Failed to analyze progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get user goals based on their type
  private getUserGoals(userType: string): string {
    switch (userType) {
      case 'diabetes':
        return 'Blood sugar management, stable energy levels, heart health';
      case 'gym':
        return 'Muscle building, performance optimization, body composition';
      default:
        return 'Overall health, balanced nutrition, sustainable habits';
    }
  }

  // Check if API is configured
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const geminiAI = new GeminiAIService();
export default geminiAI;
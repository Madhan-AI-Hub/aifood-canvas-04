import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useDailySummary } from "@/hooks/useDailySummary";
import { useActivityData } from "@/hooks/useActivityData";
import { useMealLogs } from "@/hooks/useMealLogs";
import geminiAI, { ChatResponse, FoodAnalysisResult } from "@/lib/geminiAI";
import { 
  Send, 
  Bot, 
  User,
  Sparkles,
  MessageCircle,
  Camera,
  Image as ImageIcon,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Utensils,
  Target
} from "lucide-react";

interface Message {
  id: number;
  type: 'bot' | 'user';
  message: string;
  timestamp: string;
  suggestions?: string[];
  foodAnalysis?: FoodAnalysisResult;
  imageUrl?: string;
  actionType?: string;
}

const smartQuestions = {
  diabetes: [
    "What foods help stabilize blood sugar?",
    "How to count carbs effectively?",
    "Best low-glycemic meal ideas",
    "Managing post-meal glucose spikes",
    "Diabetes-friendly snacks"
  ],
  gym: [
    "Pre-workout nutrition timing",
    "Post-workout recovery meals",
    "High-protein meal ideas",
    "Bulking vs cutting nutrition",
    "Supplement recommendations"
  ],
  general: [
    "What should I eat for energy?",
    "How to meal prep for the week?",
    "Healthy dinner ideas",
    "How to track macros?",
    "Weight management tips"
  ]
};

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { profile } = useProfile();
  const { goals } = useNutritionGoals();
  const { summary } = useDailySummary(new Date().toISOString().split('T')[0]);
  const { todayActivity } = useActivityData();
  const { addMeal } = useMealLogs();

  // Initialize with AI greeting
  useEffect(() => {
    if (messages.length === 0) {
      const userType = profile?.user_type || 'general';
      const greeting = getUserGreeting(userType);
      
      setMessages([{
        id: 1,
        type: "bot",
        message: greeting.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: greeting.suggestions
      }]);
    }
  }, [messages.length, profile?.user_type]);

  const getUserGreeting = (userType: string) => {
    switch (userType) {
      case 'diabetes':
        return {
          message: "Hello! I'm your AI Diabetes Nutrition Assistant. I'm here to help you manage your blood sugar levels through smart food choices. How can I assist you today?",
          suggestions: ["Check my blood sugar impact", "Low-carb meal ideas", "Analyze my food photo"]
        };
      case 'gym':
        return {
          message: "Hey there! I'm your AI Fitness Nutrition Coach. Ready to optimize your nutrition for peak performance? Let's fuel those gains!",
          suggestions: ["Pre-workout nutrition", "High-protein meals", "Analyze my meal photo"]
        };
      default:
        return {
          message: "Hi! I'm your AI Nutrition Assistant. I'm here to help you make healthier food choices and reach your wellness goals. What would you like to know?",
          suggestions: ["Healthy meal ideas", "Nutrition advice", "Analyze food photo"]
        };
    }
  };

  const sendMessage = async (customMessage?: string, isImageAnalysis = false) => {
    const messageText = customMessage || inputMessage;
    if (!messageText.trim() && !isImageAnalysis) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      message: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customMessage) setInputMessage("");
    setIsTyping(true);

    try {
      let response: ChatResponse;

      // Check if it's a meal suggestion request
      if (messageText.toLowerCase().includes('meal') && 
          (messageText.toLowerCase().includes('breakfast') || 
           messageText.toLowerCase().includes('lunch') || 
           messageText.toLowerCase().includes('dinner') || 
           messageText.toLowerCase().includes('snack'))) {
        
        const mealTypeMatch = messageText.toLowerCase();
        let detectedMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch';
        
        if (mealTypeMatch.includes('breakfast')) detectedMealType = 'breakfast';
        else if (mealTypeMatch.includes('lunch')) detectedMealType = 'lunch';
        else if (mealTypeMatch.includes('dinner')) detectedMealType = 'dinner';
        else if (mealTypeMatch.includes('snack')) detectedMealType = 'snack';

        response = await geminiAI.getMealSuggestions(profile, detectedMealType);
      }
      // Check if it's a progress analysis request
      else if (messageText.toLowerCase().includes('progress') || 
               messageText.toLowerCase().includes('analysis') || 
               messageText.toLowerCase().includes('how am i doing')) {
        
        const nutritionData = {
          daily_calories: goals?.daily_calories,
          daily_carbs: goals?.daily_carbs,
          daily_proteins: goals?.daily_proteins,
          daily_fats: goals?.daily_fats,
          consumed_calories: summary?.total_calories,
          consumed_carbs: summary?.total_carbs,
          consumed_proteins: summary?.total_proteins,
          consumed_fats: summary?.total_fats,
          progress_percentage: goals?.daily_calories ? (summary?.total_calories || 0) / goals.daily_calories * 100 : 0
        };

        const activityData = {
          steps: todayActivity?.steps,
          active_minutes: todayActivity?.active_minutes,
          calories_burned: todayActivity?.calories_burned,
          exercise_sessions: todayActivity?.exercise_sessions
        };

        response = await geminiAI.analyzeProgress(profile, nutritionData, activityData);
      }
      // Default nutrition advice
      else {
        const nutritionData = {
          daily_calories: goals?.daily_calories,
          daily_carbs: goals?.daily_carbs,
          daily_proteins: goals?.daily_proteins,
          daily_fats: goals?.daily_fats,
          consumed_calories: summary?.total_calories,
          consumed_carbs: summary?.total_carbs,
          consumed_proteins: summary?.total_proteins,
          consumed_fats: summary?.total_fats
        };

        const activityData = {
          steps: todayActivity?.steps,
          active_minutes: todayActivity?.active_minutes,
          calories_burned: todayActivity?.calories_burned
        };

        response = await geminiAI.getNutritionAdvice(profile, messageText, nutritionData, activityData);
      }

      const botMessage: Message = {
        id: messages.length + 2,
        type: "bot",
        message: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions,
        actionType: response.actionType
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('AI response error:', error);

      // Provide more detailed feedback when model/method is unavailable
      const errMsg = error instanceof Error ? error.message : String(error);
      let userFacing = "I'm sorry, I'm having trouble connecting to my AI brain right now. Please try again in a moment.";

      if (errMsg.toLowerCase().includes('model/method not available') || errMsg.toLowerCase().includes('model/method not available')) {
        userFacing = "The AI model requested is not available. We're trying fallback models — please try again in a moment.";
      } else if (errMsg.toLowerCase().includes('gemini api') || errMsg.toLowerCase().includes('model')) {
        userFacing = "There was an issue with the AI service. Please check your Gemini API key or try again later.";
      }

      const errorMessage: Message = {
        id: messages.length + 2,
        type: "bot",
        message: userFacing,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["Try again", "Ask different question", "Get meal suggestions"]
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "AI Assistant Error",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPEG, PNG, WebP)",
        variant: "destructive"
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setImageDialogOpen(true);
  };

  const analyzeFood = async () => {
    if (!selectedImage) return;

    setAnalyzingImage(true);
    setImageDialogOpen(false);

    // Add user message with image
    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      message: "Please analyze this food image",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: imagePreview || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const analysis = await geminiAI.analyzeFoodImage(selectedImage);
      
      const botMessage: Message = {
        id: messages.length + 2,
        type: "bot",
        message: `I can see ${analysis.foodName} in your image! Here's the nutritional breakdown:\n\n🍽️ **${analysis.foodName}**\n📊 **Estimated Portion:** ${analysis.portionSize.estimated} (${analysis.portionSize.grams}g)\n\n**Nutrition per serving:**\n• Calories: ${Math.round(analysis.nutrition.calories)}\n• Carbs: ${Math.round(analysis.nutrition.carbs)}g\n• Protein: ${Math.round(analysis.nutrition.proteins)}g\n• Fat: ${Math.round(analysis.nutrition.fats)}g\n\n**AI Suggestions:**\n${analysis.suggestions.map(s => `• ${s}`).join('\n')}\n\nWould you like me to log this meal for you?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["Log this meal", "Get cooking tips", "Ask about nutrition"],
        foodAnalysis: analysis,
        actionType: 'food_analysis'
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Food analysis error:', error);
      const errorMessage: Message = {
        id: messages.length + 2,
        type: "bot",
        message: "I'm having trouble analyzing this image. This could be due to image quality or temporary connectivity issues. Please try again with a clear, well-lit photo of your food.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["Try another photo", "Enter food manually", "Ask nutrition question"]
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Image Analysis Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setAnalyzingImage(false);
      setIsTyping(false);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const logAnalyzedFood = async (analysis: FoodAnalysisResult) => {
    if (!analysis) return;

    try {
      await addMeal({
        meal_type: analysis.mealType || 'lunch',
        food_name: analysis.foodName,
        portion_size: analysis.portionSize.grams,
        calories: analysis.nutrition.calories,
        carbs: analysis.nutrition.carbs,
        fats: analysis.nutrition.fats,
        proteins: analysis.nutrition.proteins,
        logged_at: new Date().toISOString()
      });

      toast({
        title: "Meal Logged Successfully!",
        description: `${analysis.foodName} has been added to your food log`,
        variant: "default"
      });

      // Add confirmation message
      const botMessage: Message = {
        id: messages.length + 1,
        type: "bot",
        message: `Perfect! I've logged "${analysis.foodName}" to your ${analysis.mealType || 'lunch'} for today. Your nutrition tracking is up to date! 🎉`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["View my progress", "Analyze another food", "Get meal suggestions"]
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Failed to log meal:', error);
      toast({
        title: "Failed to Log Meal",
        description: "Please try again or add the meal manually in Food Log",
        variant: "destructive"
      });
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const userType = profile?.user_type || 'general';
  const questions = smartQuestions[userType as keyof typeof smartQuestions];
  const apiConfigured = geminiAI.isConfigured();

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-8 w-8" />
            AI Nutrition Chatbot
          </h1>
          <p className="text-fitness-light">
            Get personalized nutrition advice, meal suggestions, and food analysis
            {profile?.user_type && (
              <span className="ml-2">
                • Optimized for <span className="text-fitness-primary font-semibold capitalize">{profile.user_type}</span> goals
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${apiConfigured ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400'} w-fit`}>
            <div className={`w-2 h-2 rounded-full ${apiConfigured ? 'bg-green-500' : 'bg-yellow-500'} mr-2`} />
            {apiConfigured ? 'AI Online' : 'Demo Mode'}
          </Badge>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
          >
            <Camera className="h-4 w-4 mr-2" />
            Analyze Food
          </Button>
        </div>
      </div>

      {/* API Warning */}
      {!apiConfigured && (
        <div className="mb-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-200 text-sm">
              AI features are in demo mode. Add VITE_GEMINI_API_KEY to environment for full functionality.
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Smart Questions Sidebar */}
        <Card className="lg:col-span-1 fitness-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Sparkles className="h-4 w-4 text-fitness-primary" />
              Smart Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {questions.map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full text-left text-sm h-auto p-3 whitespace-normal justify-start text-fitness-light hover:bg-fitness-muted/20"
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </Button>
            ))}
            
            <div className="mt-4 pt-4 border-t border-fitness-muted/20">
              <Label className="text-xs text-fitness-muted">Quick Actions</Label>
              <div className="space-y-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sendMessage("Analyze my progress today")}
                  className="w-full justify-start text-fitness-light hover:bg-fitness-muted/20"
                >
                  <TrendingUp className="h-3 w-3 mr-2" />
                  My Progress
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sendMessage("Suggest healthy lunch ideas")}
                  className="w-full justify-start text-fitness-light hover:bg-fitness-muted/20"
                >
                  <Utensils className="h-3 w-3 mr-2" />
                  Meal Ideas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full justify-start text-fitness-light hover:bg-fitness-muted/20"
                >
                  <Camera className="h-3 w-3 mr-2" />
                  Scan Food
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 fitness-card flex flex-col">
          <CardHeader className="border-b border-fitness-muted/20">
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5 text-fitness-primary" />
              AI Assistant
              {profile?.user_type && (
                <Badge variant="outline" className="ml-auto border-fitness-primary text-fitness-primary">
                  {profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1)} Mode
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className={message.type === "user" ? "bg-fitness-primary" : "bg-fitness-muted"}>
                      {message.type === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div className={`flex flex-col max-w-[80%] ${message.type === "user" ? "items-end" : ""}`}>
                    {/* User Image */}
                    {message.imageUrl && (
                      <div className="mb-2">
                        <img 
                          src={message.imageUrl} 
                          alt="Food upload" 
                          className="max-w-48 rounded-lg border border-fitness-muted/20"
                        />
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl ${
                        message.type === "user" 
                          ? "bg-fitness-primary text-fitness-dark" 
                          : "bg-fitness-dark border border-fitness-muted/20 text-white"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.message}</p>
                    </div>
                    <span className="text-xs text-fitness-muted mt-1 px-1">
                      {message.timestamp}
                    </span>

                    {/* Action Buttons */}
                    {message.foodAnalysis && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          onClick={() => logAnalyzedFood(message.foodAnalysis!)}
                          className="fitness-button text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Log This Meal
                        </Button>
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 border-fitness-muted/20 text-fitness-light hover:bg-fitness-muted/20"
                            onClick={() => handleQuickQuestion(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {(isTyping || analyzingImage) && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-fitness-muted">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-fitness-dark border border-fitness-muted/20 text-white p-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-fitness-primary" />
                      <span className="text-sm">
                        {analyzingImage ? "Analyzing food image..." : "AI is thinking..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-fitness-muted/20 p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything about nutrition, upload a food photo, or request meal suggestions..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && sendMessage()}
                className="flex-1 fitness-input"
                disabled={isTyping || analyzingImage}
              />
              <Button 
                onClick={() => sendMessage()} 
                disabled={!inputMessage.trim() || isTyping || analyzingImage}
                className="fitness-button px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-fitness-muted">
              <span>
                💡 Try: "Analyze my progress", "High protein breakfast", or upload a food photo
              </span>
              {apiConfigured && (
                <span className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-green-500 rounded-full" />
                  Powered by Gemini AI
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Image Analysis Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="fitness-card border-0">
          <DialogHeader>
            <DialogTitle className="text-white">Analyze Food Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {imagePreview && (
              <div className="flex justify-center">
                <img 
                  src={imagePreview} 
                  alt="Food preview" 
                  className="max-h-64 rounded-lg border border-fitness-muted/20"
                />
              </div>
            )}
            
            <div>
              <Label className="text-white">Meal Type</Label>
              <Select value={mealType} onValueChange={(value: 'breakfast' | 'lunch' | 'dinner' | 'snack') => setMealType(value)}>
                <SelectTrigger className="fitness-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={analyzeFood} 
                disabled={!selectedImage || analyzingImage}
                className="flex-1 fitness-button"
              >
                {analyzingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Analyze Food
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setImageDialogOpen(false);
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
              >
                Cancel
              </Button>
            </div>

            <div className="text-xs text-fitness-muted p-3 bg-fitness-dark/30 rounded-lg">
              <p className="font-semibold mb-1">💡 Tips for better analysis:</p>
              <ul className="space-y-1">
                <li>• Use good lighting and clear focus</li>
                <li>• Show the entire food item/meal</li>
                <li>• Include reference objects for size estimation</li>
                <li>• Avoid blurry or dark images</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Bot, 
  User,
  Sparkles,
  MessageCircle
} from "lucide-react";

const initialMessages = [
  {
    id: 1,
    type: "bot",
    message: "Hello! I'm your AI Nutrition Assistant. How can I help you today?",
    timestamp: "10:00 AM",
    suggestions: ["Check my nutrition", "Food recommendations", "Health tips"]
  },
  {
    id: 2,
    type: "user",
    message: "I want to know about healthy breakfast options",
    timestamp: "10:02 AM"
  },
  {
    id: 3,
    type: "bot",
    message: "Great question! Here are some nutritious breakfast options:\n\n1. **Oatmeal with berries** - High in fiber and antioxidants\n2. **Greek yogurt with nuts** - Packed with protein\n3. **Avocado toast** - Healthy fats and whole grains\n4. **Smoothie bowl** - Vitamins and minerals\n\nWould you like specific recipes for any of these?",
    timestamp: "10:02 AM"
  },
  {
    id: 4,
    type: "user",
    message: "Tell me more about the smoothie bowl",
    timestamp: "10:05 AM"
  },
  {
    id: 5,
    type: "bot",
    message: "Perfect choice! Here's a delicious smoothie bowl recipe:\n\n**Green Power Smoothie Bowl**\n\nIngredients:\n• 1 frozen banana\n• 1 cup spinach\n• 1/2 avocado\n• 1 cup almond milk\n• 1 tbsp chia seeds\n\nToppings:\n• Fresh berries\n• Granola\n• Coconut flakes\n• Honey drizzle\n\nThis provides ~350 calories, 15g protein, and tons of vitamins!",
    timestamp: "10:05 AM"
  }
];

const quickQuestions = [
  "What should I eat for energy?",
  "How to meal prep for the week?",
  "Best post-workout snacks?",
  "Healthy dinner ideas",
  "How to track macros?"
];

export default function Chatbot() {
  const [messages, setMessages] = useState(initialMessages);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: "user" as const,
      message: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        type: "bot" as const,
        message: "Thanks for your question! I'd be happy to help you with that. This is a demo response showing how I can provide personalized nutrition advice based on your needs.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
  };

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8" />
            AI Nutrition Chatbot
          </h1>
          <p className="text-muted-foreground">Get personalized nutrition advice and recommendations</p>
        </div>
        <Badge variant="outline" className="text-success w-fit">
          <div className="w-2 h-2 rounded-full bg-success mr-2" />
          Online
        </Badge>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Quick Questions Sidebar */}
        <Card className="lg:col-span-1 gradient-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Quick Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full text-left text-sm h-auto p-3 whitespace-normal justify-start"
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3 gradient-card border border-border flex flex-col">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
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
                    <AvatarFallback className={message.type === "user" ? "bg-primary" : "bg-accent"}>
                      {message.type === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div className={`flex flex-col max-w-[80%] ${message.type === "user" ? "items-end" : ""}`}>
                    <div
                      className={`p-3 rounded-2xl ${
                        message.type === "user" 
                          ? "chat-bubble-user" 
                          : "chat-bubble-bot"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {message.timestamp}
                    </span>

                    {/* Suggestions */}
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-6"
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
              {isTyping && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-accent">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="chat-bubble-bot p-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything about nutrition..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!inputMessage.trim() || isTyping}
                className="px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
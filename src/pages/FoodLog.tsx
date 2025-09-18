import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Plus, 
  Coffee, 
  UtensilsCrossed, 
  Moon,
  Search,
  Trash2
} from "lucide-react";

const mealData = {
  breakfast: [
    { name: "Oatmeal with berries", calories: 320, time: "8:00 AM" },
    { name: "Greek yogurt", calories: 130, time: "8:15 AM" },
    { name: "Orange juice", calories: 110, time: "8:20 AM" }
  ],
  lunch: [
    { name: "Grilled chicken salad", calories: 450, time: "1:00 PM" },
    { name: "Whole grain roll", calories: 120, time: "1:15 PM" }
  ],
  dinner: [
    { name: "Salmon with quinoa", calories: 520, time: "7:30 PM" },
    { name: "Steamed vegetables", calories: 80, time: "7:35 PM" }
  ]
};

export default function FoodLog() {
  const [foodInput, setFoodInput] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("breakfast");

  const getMealIcon = (meal: string) => {
    switch (meal) {
      case "breakfast": return <Coffee className="h-5 w-5" />;
      case "lunch": return <UtensilsCrossed className="h-5 w-5" />;
      case "dinner": return <Moon className="h-5 w-5" />;
      default: return <Coffee className="h-5 w-5" />;
    }
  };

  const getTotalCalories = (meals: any[]) => {
    return meals.reduce((total, meal) => total + meal.calories, 0);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Food Log</h1>
        <p className="text-muted-foreground">Track your daily meals and nutrition</p>
      </div>

      {/* Food Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Text Input */}
        <Card className="gradient-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Add Food by Name
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="food-input">Enter food name</Label>
              <Input
                id="food-input"
                placeholder="e.g., Grilled chicken breast, Apple, Rice..."
                value={foodInput}
                onChange={(e) => setFoodInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Add to meal</Label>
              <Tabs value={selectedMeal} onValueChange={setSelectedMeal} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
                  <TabsTrigger value="lunch">Lunch</TabsTrigger>
                  <TabsTrigger value="dinner">Dinner</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button className="w-full" onClick={() => alert(`Added "${foodInput}" to ${selectedMeal}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Food
            </Button>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="gradient-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Food Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Drop your food image here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <Button variant="outline">
                Choose File
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Supported formats: JPG, PNG, WebP (Max 10MB)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Meals Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(mealData).map(([mealType, meals]) => (
          <Card key={mealType} className="gradient-card border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 capitalize">
                  {getMealIcon(mealType)}
                  {mealType}
                </div>
                <Badge variant="secondary">
                  {getTotalCalories(meals)} cal
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No foods logged yet
                  </p>
                ) : (
                  meals.map((meal, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{meal.name}</p>
                        <p className="text-xs text-muted-foreground">{meal.time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{meal.calories} cal</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => alert(`Add food to ${mealType}`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Food
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Summary */}
      <Card className="gradient-card border border-border">
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">1730</p>
              <p className="text-sm text-muted-foreground">Total Calories</p>
            </div>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Foods Logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold">78%</p>
              <p className="text-sm text-muted-foreground">Goal Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold">3</p>
              <p className="text-sm text-muted-foreground">Meals</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
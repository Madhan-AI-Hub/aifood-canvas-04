import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
  Coffee, 
  UtensilsCrossed, 
  Moon,
  Plus,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Utensils,
  CheckCircle2,
  Target,
  Calendar,
  BarChart3,
  Info,
  X
} from "lucide-react";
import { useMealLogs, type MealLog } from "@/hooks/useMealLogs";
import { useDailySummary } from "@/hooks/useDailySummary";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useToast } from "@/hooks/use-toast";
import FoodSearch from "@/components/FoodSearch";
import ImageUpload from "@/components/ImageUpload";
import MealCard from "@/components/MealCard";

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { value: MealType; label: string; icon: React.ReactNode; }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: <Coffee className="h-5 w-5" /> },
  { value: 'lunch', label: 'Lunch', icon: <UtensilsCrossed className="h-5 w-5" /> },
  { value: 'dinner', label: 'Dinner', icon: <Moon className="h-5 w-5" /> },
  { value: 'snack', label: 'Snacks', icon: <Utensils className="h-5 w-5" /> }
];

export default function FoodLog() {
  // State management
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [showFoodEntry, setShowFoodEntry] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();

  // Hooks for data fetching
  const { 
    meals, 
    loading: mealsLoading, 
    error: mealsError, 
    addMeal, 
    updateMeal, 
    deleteMeal, 
    getMealsByType,
    getTodaysTotals,
    refetch: refetchMeals 
  } = useMealLogs();

  const { 
    summary, 
    loading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary 
  } = useDailySummary();

  const { 
    goals, 
    loading: goalsLoading, 
    error: goalsError 
  } = useNutritionGoals();

  // Combine loading states
  const isLoading = mealsLoading || summaryLoading || goalsLoading;
  const hasError = mealsError || summaryError || goalsError;

  // Calculate daily progress with better accuracy
  const dailyProgress = useMemo(() => {
    if (!goals || !summary) return {
      calories: { percentage: 0, health: 'Low' as const },
      carbs: { percentage: 0, health: 'Low' as const },
      fats: { percentage: 0, health: 'Low' as const },
      proteins: { percentage: 0, health: 'Low' as const },
      totalMeals: 0,
      totalFoods: 0,
      healthScore: 'Low' as const,
      healthColor: 'text-yellow-600',
      isOnTrack: false
    };

    const calculateProgress = (current: number, target: number) => {
      if (target === 0) return { percentage: 0, health: 'Low' as const };
      const percentage = (current / target) * 100;
      
      let health: 'Low' | 'Good' | 'High' = 'Good';
      if (percentage < 50) {
        health = 'Low';
      } else if (percentage > 110) {
        health = 'High';
      }
      
      return { percentage, health };
    };

    const caloriesProgress = calculateProgress(summary.total_calories, goals.daily_calories);
    const carbsProgress = calculateProgress(summary.total_carbs, goals.daily_carbs);
    const fatsProgress = calculateProgress(summary.total_fats, goals.daily_fats);
    const proteinsProgress = calculateProgress(summary.total_proteins, goals.daily_proteins);
    const totalFoods = meals.length;

    // Calculate health score based on balance
    const avgProgress = (caloriesProgress.percentage + carbsProgress.percentage + fatsProgress.percentage + proteinsProgress.percentage) / 4;
    let healthScore: 'Low' | 'Good' | 'High' = 'Good';
    let healthColor = 'text-green-600';
    
    if (avgProgress < 50) {
      healthScore = 'Low';
      healthColor = 'text-yellow-600';
    } else if (avgProgress > 110) {
      healthScore = 'High';
      healthColor = 'text-orange-600';
    }

    return {
      calories: caloriesProgress,
      carbs: carbsProgress,
      fats: fatsProgress,
      proteins: proteinsProgress,
      totalMeals: summary.meals_logged || 0,
      totalFoods: totalFoods,
      healthScore,
      healthColor,
      isOnTrack: avgProgress >= 80 && avgProgress <= 110
    };
  }, [goals, summary, meals.length]);

  // Handle food selection from search
  const handleFoodSelected = useCallback(async (
    foodName: string,
    portionSize: number,
    nutrition: { calories: number; carbs: number; fats: number; proteins: number },
    mealType: string
  ) => {
    try {
      await addMeal({
        meal_type: mealType as MealType,
        food_name: foodName,
        portion_size: portionSize,
        calories: nutrition.calories,
        carbs: nutrition.carbs,
        fats: nutrition.fats,
        proteins: nutrition.proteins,
        image_url: uploadedImageUrl || undefined
      });

      // Clear uploaded image after successful meal log
      setUploadedImageUrl(null);
      setShowFoodEntry(false);

      // Show success toast with nutrition info
      toast({
        title: "Food Logged Successfully! 🎉",
        description: `Added ${foodName} (${nutrition.calories} cal) to ${mealType}`,
      });

    } catch (error) {
      console.error('Failed to add meal:', error);
      toast({
        title: "Failed to Add Food",
        description: "There was an error logging your meal. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [addMeal, uploadedImageUrl, toast]);

  // Handle image upload
  const handleImageUploaded = useCallback((imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  }, []);

  // Handle image removal
  const handleImageRemoved = useCallback(() => {
    setUploadedImageUrl(null);
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchMeals(), refetchSummary()]);
      toast({
        title: "Data Refreshed",
        description: "Your food log is up to date.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchMeals, refetchSummary, toast]);

  // Get meals for specific type
  const getMealsForType = useCallback((mealType: MealType) => {
    return getMealsByType(mealType);
  }, [getMealsByType]);

  // Calculate total calories for meal type
  const getTotalCalories = useCallback((mealType: MealType) => {
    const meals = getMealsForType(mealType);
    return meals.reduce((total, meal) => total + meal.calories, 0);
  }, [getMealsForType]);

  // Wrapper functions to handle return types for MealCard
  const handleMealEdit = useCallback(async (id: string, updates: Partial<MealLog>) => {
    await updateMeal(id, updates);
  }, [updateMeal]);

  const handleMealDelete = useCallback(async (id: string) => {
    await deleteMeal(id);
  }, [deleteMeal]);

  // Error state with retry
  if (hasError) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Food Log</h1>
            <p className="text-fitness-light">Track your daily meals and nutrition</p>
          </div>
        </div>

        <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <AlertDescription className="text-red-200">
            <p className="font-medium mb-2">Failed to load food log data</p>
            <p className="text-sm">{mealsError || summaryError || goalsError}</p>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button onClick={refreshData} variant="outline" className="border-fitness-muted text-fitness-light">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Food Log</h1>
          <p className="text-fitness-light">Track your daily meals and nutrition</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm" 
            disabled={isLoading || isRefreshing}
            className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="border-fitness-primary text-fitness-primary flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {new Date().toLocaleDateString()}
          </Badge>
        </div>
      </div>

      {/* Progress Overview Card - Collapsed by default on mobile */}
      {!isLoading && goals && summary && dailyProgress && (
        <Card className="fitness-card border-fitness-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-fitness-primary" />
                Today's Progress
              </div>
              <Badge 
                variant="outline" 
                className={`${dailyProgress.healthColor} border-current`}
              >
                {dailyProgress.healthScore}
                {dailyProgress.isOnTrack && <CheckCircle2 className="h-3 w-3 ml-1" />}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Macros Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fitness-light">Calories</span>
                  <span className="font-medium text-white">
                    {Math.round(summary.total_calories)} / {Math.round(goals.daily_calories)}
                  </span>
                </div>
                <Progress value={Math.min(100, dailyProgress.calories.percentage)} className="h-2" />
                <p className="text-xs text-fitness-muted">{dailyProgress.calories.percentage.toFixed(0)}% of goal</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fitness-light">Carbs</span>
                  <span className="font-medium text-white">
                    {Math.round(summary.total_carbs)}g / {Math.round(goals.daily_carbs)}g
                  </span>
                </div>
                <Progress value={Math.min(100, dailyProgress.carbs.percentage)} className="h-2" />
                <p className="text-xs text-fitness-muted">{dailyProgress.carbs.percentage.toFixed(0)}% of goal</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fitness-light">Fats</span>
                  <span className="font-medium text-white">
                    {Math.round(summary.total_fats)}g / {Math.round(goals.daily_fats)}g
                  </span>
                </div>
                <Progress value={Math.min(100, dailyProgress.fats.percentage)} className="h-2" />
                <p className="text-xs text-fitness-muted">{dailyProgress.fats.percentage.toFixed(0)}% of goal</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fitness-light">Proteins</span>
                  <span className="font-medium text-white">
                    {Math.round(summary.total_proteins)}g / {Math.round(goals.daily_proteins)}g
                  </span>
                </div>
                <Progress value={Math.min(100, dailyProgress.proteins.percentage)} className="h-2" />
                <p className="text-xs text-fitness-muted">{dailyProgress.proteins.percentage.toFixed(0)}% of goal</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-around pt-4 border-t border-fitness-muted/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{dailyProgress.totalFoods}</p>
                <p className="text-xs text-fitness-light">Foods Logged</p>
              </div>
              <div className="h-10 w-px bg-fitness-muted/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{dailyProgress.totalMeals}</p>
                <p className="text-xs text-fitness-light">Meal Sessions</p>
              </div>
              <div className="h-10 w-px bg-fitness-muted/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {Math.round((dailyProgress.calories.percentage + dailyProgress.carbs.percentage + dailyProgress.fats.percentage + dailyProgress.proteins.percentage) / 4)}%
                </p>
                <p className="text-xs text-fitness-light">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Food Entry Section */}
      <Card className="fitness-card border-fitness-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-fitness-primary" />
              Add New Food
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowFoodEntry(!showFoodEntry)}
              className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
            >
              {showFoodEntry ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Food
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {showFoodEntry && (
          <CardContent>
            {/* Meal Type Selection - Above food entry */}
            <div className="mb-6">
              <Label className="text-white mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-fitness-primary" />
                Select Meal Type
              </Label>
              <Tabs value={selectedMeal} onValueChange={(value) => setSelectedMeal(value as MealType)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-fitness-dark/50">
                  {MEAL_TYPES.map((meal) => (
                    <TabsTrigger 
                      key={meal.value} 
                      value={meal.value} 
                      className="flex items-center gap-2 data-[state=active]:bg-fitness-primary data-[state=active]:text-fitness-dark"
                    >
                      {meal.icon}
                      <span className="hidden sm:inline">{meal.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Food Search Component */}
              <FoodSearch
                onFoodSelected={handleFoodSelected}
                selectedMealType={selectedMeal}
                disabled={isLoading}
              />

              {/* Image Upload Component */}
              <ImageUpload
                onImageUploaded={handleImageUploaded}
                onImageRemoved={handleImageRemoved}
                disabled={isLoading}
                existingImageUrl={uploadedImageUrl || undefined}
              />
            </div>

            {/* Helpful Tips */}
            <Alert className="mt-6 border-fitness-primary/20 bg-fitness-primary/5">
              <Info className="h-4 w-4 text-fitness-primary" />
              <AlertDescription className="text-fitness-light text-sm">
                <strong>Tip:</strong> Upload a photo of your meal for better tracking, or search our database 
                of 1000+ foods. You can also add custom foods with manual nutrition entry.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Meals Display with Tabs */}
      <Card className="fitness-card border-fitness-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5 text-fitness-primary" />
            Today's Meals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="breakfast" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-fitness-dark/50">
              {MEAL_TYPES.map((mealType) => {
                const mealCount = getMealsForType(mealType.value).length;
                const totalCalories = getTotalCalories(mealType.value);
                
                return (
                  <TabsTrigger
                    key={mealType.value}
                    value={mealType.value}
                    className="data-[state=active]:bg-fitness-primary data-[state=active]:text-white"
                  >
                    <div className="flex flex-col items-center gap-1 py-1">
                      <div className="flex items-center gap-2">
                        {mealType.icon}
                        <span className="hidden sm:inline">{mealType.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="bg-fitness-muted/20 text-fitness-light border-0 h-5 px-2">
                          {mealCount}
                        </Badge>
                        <span className="text-fitness-muted">{Math.round(totalCalories)} cal</span>
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {MEAL_TYPES.map((mealType) => {
              const meals = getMealsForType(mealType.value);
              const totalCalories = getTotalCalories(mealType.value);

              return (
                <TabsContent key={mealType.value} value={mealType.value} className="mt-6 space-y-4">
                  {/* Meal Type Header with Stats */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-fitness-dark/30 border border-fitness-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{mealType.value === 'breakfast' ? '☕' : mealType.value === 'lunch' ? '🍱' : mealType.value === 'dinner' ? '🍽️' : '🍎'}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white capitalize">{mealType.label}</h3>
                        <p className="text-sm text-fitness-muted">{meals.length} {meals.length === 1 ? 'item' : 'items'} logged</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-fitness-primary">{Math.round(totalCalories)}</p>
                      <p className="text-xs text-fitness-muted">calories</p>
                    </div>
                  </div>

                  {isLoading ? (
                    // Loading skeletons
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="bg-fitness-dark/50 border-0">
                          <CardContent className="p-4 space-y-2">
                            <Skeleton className="h-4 w-3/4 bg-fitness-muted/20" />
                            <Skeleton className="h-3 w-1/2 bg-fitness-muted/20" />
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <Skeleton className="h-3 w-full bg-fitness-muted/20" />
                              <Skeleton className="h-3 w-full bg-fitness-muted/20" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : meals.length === 0 ? (
                    // Empty state with better design
                    <div className="text-center py-16 space-y-4">
                      <div className="text-6xl opacity-50">{mealType.value === 'breakfast' ? '☕' : mealType.value === 'lunch' ? '🍱' : mealType.value === 'dinner' ? '🍽️' : '🍎'}</div>
                      <div>
                        <p className="text-lg text-fitness-light font-medium">No {mealType.label.toLowerCase()} logged yet</p>
                        <p className="text-sm text-fitness-muted mt-2">Start tracking your {mealType.label.toLowerCase()} to monitor your nutrition goals</p>
                      </div>
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => {
                          setSelectedMeal(mealType.value);
                          setShowFoodEntry(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="mt-4 bg-fitness-primary hover:bg-fitness-primary/90"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add {mealType.label}
                      </Button>
                    </div>
                  ) : (
                    // Meal cards with scroll
                    <div className="space-y-4">
                      <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-fitness-muted scrollbar-track-transparent">
                        {meals.map((meal) => (
                          <MealCard
                            key={meal.id}
                            meal={meal}
                            onEdit={handleMealEdit}
                            onDelete={handleMealDelete}
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                      
                      {/* Add more button */}
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full border-fitness-primary/30 text-fitness-primary hover:bg-fitness-primary/10 hover:text-white"
                        onClick={() => {
                          setSelectedMeal(mealType.value);
                          setShowFoodEntry(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add More to {mealType.label}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <Card className="fitness-card border-fitness-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-fitness-primary" />
            Daily Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full bg-fitness-muted/20" />
              <Skeleton className="h-6 w-full bg-fitness-muted/20" />
              <Skeleton className="h-6 w-full bg-fitness-muted/20" />
              <Skeleton className="h-6 w-full bg-fitness-muted/20" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Nutrition Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-fitness-dark/50 border border-fitness-muted/10">
                  <p className="text-2xl font-bold text-fitness-primary">
                    {Math.round(summary?.total_calories || 0)}
                  </p>
                  <p className="text-xs text-fitness-muted mt-1">Calories</p>
                  <p className="text-xs text-fitness-light mt-1">
                    of {Math.round(goals?.daily_calories || 0)}
                  </p>
                </div>

                <div className="text-center p-4 rounded-lg bg-fitness-dark/50 border border-fitness-muted/10">
                  <p className="text-2xl font-bold text-blue-400">
                    {Math.round(summary?.total_carbs || 0)}g
                  </p>
                  <p className="text-xs text-fitness-muted mt-1">Carbs</p>
                  <p className="text-xs text-fitness-light mt-1">
                    of {Math.round(goals?.daily_carbs || 0)}g
                  </p>
                </div>

                <div className="text-center p-4 rounded-lg bg-fitness-dark/50 border border-fitness-muted/10">
                  <p className="text-2xl font-bold text-red-400">
                    {Math.round(summary?.total_fats || 0)}g
                  </p>
                  <p className="text-xs text-fitness-muted mt-1">Fats</p>
                  <p className="text-xs text-fitness-light mt-1">
                    of {Math.round(goals?.daily_fats || 0)}g
                  </p>
                </div>

                <div className="text-center p-4 rounded-lg bg-fitness-dark/50 border border-fitness-muted/10">
                  <p className="text-2xl font-bold text-green-400">
                    {Math.round(summary?.total_proteins || 0)}g
                  </p>
                  <p className="text-xs text-fitness-muted mt-1">Proteins</p>
                  <p className="text-xs text-fitness-light mt-1">
                    of {Math.round(goals?.daily_proteins || 0)}g
                  </p>
                </div>
              </div>

              {/* Progress Insights */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-fitness-primary" />
                  Today's Insights
                </h3>
                
                <div className="space-y-2">
                  {/* Calorie insight */}
                  {dailyProgress.calories.health === 'Good' ? (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-green-400 font-medium">Great job on calories!</p>
                        <p className="text-xs text-fitness-light mt-1">
                          You're {dailyProgress.calories.percentage.toFixed(0)}% of your daily goal
                        </p>
                      </div>
                    </div>
                  ) : dailyProgress.calories.health === 'Low' ? (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Info className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-yellow-400 font-medium">Low calorie intake</p>
                        <p className="text-xs text-fitness-light mt-1">
                          You've consumed {dailyProgress.calories.percentage.toFixed(0)}% of your goal. Consider adding a healthy meal.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <Info className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-red-400 font-medium">Over calorie target</p>
                        <p className="text-xs text-fitness-light mt-1">
                          You've exceeded your goal by {(dailyProgress.calories.percentage - 100).toFixed(0)}%. Try lighter options for remaining meals.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Macro balance insight */}
                  {dailyProgress.proteins.percentage < 80 && dailyProgress.calories.percentage > 50 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-400 font-medium">Protein boost needed</p>
                        <p className="text-xs text-fitness-light mt-1">
                          Try adding protein-rich foods like chicken, fish, or legumes to meet your {Math.round(goals?.daily_proteins || 0)}g goal.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Meal Count Stats */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-fitness-dark/50 border border-fitness-muted/10">
                <div>
                  <p className="text-sm text-fitness-light">Total Meals Logged</p>
                  <p className="text-2xl font-bold text-white mt-1">{meals.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-fitness-light">Most Active Meal</p>
                  <p className="text-lg font-semibold text-fitness-primary mt-1 capitalize">
                    {(() => {
                      let maxType: MealType = 'breakfast';
                      let maxCount = 0;
                      MEAL_TYPES.forEach(type => {
                        const count = getMealsForType(type.value).length;
                        if (count > maxCount) {
                          maxCount = count;
                          maxType = type.value;
                        }
                      });
                      return maxType;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
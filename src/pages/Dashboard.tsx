import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Flame, 
  Wheat, 
  Droplets, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useDailySummary } from "@/hooks/useDailySummary";
import { useWeeklySummary } from "@/hooks/useWeeklySummary";
import { useProfile } from "@/contexts/ProfileContext";
import { useEffect, useMemo } from "react";

type RiskLevel = "good" | "warning" | "danger";

interface NutritionData {
  calories: { current: number; target: number };
  carbs: { current: number; target: number };
  fats: { current: number; target: number };
  proteins: { current: number; target: number };
}

const foodSuggestions = {
  general: [
    "Grilled chicken breast with quinoa",
    "Mixed vegetable salad with olive oil",
    "Greek yogurt with berries",
    "Whole grain toast with avocado"
  ],
  gym: [
    "Protein shake with banana",
    "Lean beef with sweet potato",
    "Cottage cheese with almonds",
    "Tuna salad with brown rice"
  ],
  diabetes: [
    "Grilled salmon with steamed broccoli",
    "Cauliflower rice with chicken",
    "Sugar-free Greek yogurt",
    "Nuts and seeds mix"
  ]
};

export default function Dashboard() {
  // Fetch real data from hooks
  const { goals, loading: goalsLoading, error: goalsError, refetch: refetchGoals } = useNutritionGoals();
  const { summary, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useDailySummary();
  const { weeklyData, loading: weeklyLoading, error: weeklyError, analytics } = useWeeklySummary();
  const { profile } = useProfile();

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([refetchGoals(), refetchSummary()]);
  };

  // Calculate real nutrition data from fetched data
  const nutritionData: NutritionData = useMemo(() => {
    const defaultData = {
      calories: { current: 0, target: 2000 },
      carbs: { current: 0, target: 250 },
      fats: { current: 0, target: 67 },
      proteins: { current: 0, target: 150 }
    };

    if (!goals || !summary) return defaultData;

    return {
      calories: { 
        current: summary.total_calories || 0, 
        target: goals.daily_calories || 2000 
      },
      carbs: { 
        current: summary.total_carbs || 0, 
        target: goals.daily_carbs || 250 
      },
      fats: { 
        current: summary.total_fats || 0, 
        target: goals.daily_fats || 67 
      },
      proteins: { 
        current: summary.total_proteins || 0, 
        target: goals.daily_proteins || 150 
      }
    };
  }, [goals, summary]);

  // Helper function to calculate nutrition progress percentage
  const getNutritionProgress = (current: number, target: number) => 
    Math.min((current / target) * 100, 100);

  // Calculate dynamic risk level based on completion percentages
  const riskLevel: RiskLevel = useMemo(() => {
    const completions = [
      getNutritionProgress(nutritionData.calories.current, nutritionData.calories.target),
      getNutritionProgress(nutritionData.carbs.current, nutritionData.carbs.target),
      getNutritionProgress(nutritionData.fats.current, nutritionData.fats.target),
      getNutritionProgress(nutritionData.proteins.current, nutritionData.proteins.target)
    ];

    const avgCompletion = completions.reduce((a, b) => a + b, 0) / completions.length;

    if (avgCompletion >= 80) return "good";
    if (avgCompletion >= 50) return "warning";
    return "danger";
  }, [nutritionData]);

  // Get user-specific food suggestions
  const userFoodSuggestions = useMemo(() => {
    const userType = profile?.user_type || 'general';
    return foodSuggestions[userType] || foodSuggestions.general;
  }, [profile?.user_type]);

  const getRiskColor = () => {
    switch (riskLevel) {
      case "good": return "status-good";
      case "warning": return "status-warning"; 
      case "danger": return "status-danger";
      default: return "status-good";
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case "good": return <CheckCircle className="h-5 w-5" />;
      case "warning": return <AlertTriangle className="h-5 w-5" />;
      case "danger": return <XCircle className="h-5 w-5" />;
      default: return <CheckCircle className="h-5 w-5" />;
    }
  };

  // Show loading state
  const isLoading = goalsLoading || summaryLoading;
  const hasError = goalsError || summaryError || weeklyError;

  if (hasError) {
    return (
      <div className="p-6 space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. {goalsError || summaryError || weeklyError}
          </AlertDescription>
        </Alert>
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Track your daily nutrition goals</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={refreshData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Today:</span>
            <Badge variant="outline" className="text-primary">
              {new Date().toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Nutrition Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories Card */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calories</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(nutritionData.calories.current)}</div>
                <Progress 
                  value={getNutritionProgress(nutritionData.calories.current, nutritionData.calories.target)} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  of {Math.round(nutritionData.calories.target)} kcal
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Carbs Card */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbs</CardTitle>
            <Wheat className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(nutritionData.carbs.current)}g</div>
                <Progress 
                  value={getNutritionProgress(nutritionData.carbs.current, nutritionData.carbs.target)} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  of {Math.round(nutritionData.carbs.target)}g
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fats Card */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fats</CardTitle>
            <Droplets className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(nutritionData.fats.current)}g</div>
                <Progress 
                  value={getNutritionProgress(nutritionData.fats.current, nutritionData.fats.target)} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  of {Math.round(nutritionData.fats.target)}g
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Proteins Card */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proteins</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(nutritionData.proteins.current)}g</div>
                <Progress 
                  value={getNutritionProgress(nutritionData.proteins.current, nutritionData.proteins.target)} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  of {Math.round(nutritionData.proteins.target)}g
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts and Risk Level */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Progress Chart */}
        <Card className="lg:col-span-2 gradient-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading weekly data...</span>
              </div>
            ) : weeklyData && weeklyData.length > 0 ? (
              <div className="h-48 flex items-end justify-between gap-2 px-4">
                {weeklyData.map((dayData, index) => {
                  const completionPercentage = dayData.total_calories > 0 && goals?.daily_calories 
                    ? Math.min((dayData.total_calories / goals.daily_calories) * 100, 100)
                    : 0;
                  
                  const dayName = new Date(dayData.date).toLocaleDateString('en-US', { weekday: 'short' });
                  
                  return (
                    <div key={dayData.date} className="flex flex-col items-center gap-2">
                      <div 
                        className="bg-primary/20 rounded-t-lg w-8 transition-all hover:bg-primary/30 cursor-pointer"
                        style={{ height: `${Math.max(completionPercentage * 0.8, 10)}%` }}
                        title={`${dayName}: ${Math.round(completionPercentage)}% of daily goal`}
                      />
                      <span className="text-xs text-muted-foreground">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No weekly data available</p>
                  <p className="text-xs">Start logging meals to see your progress</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Level Box */}
        <Card className={`gradient-card border border-border ${getRiskColor()}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRiskIcon()}
              Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold capitalize">{riskLevel}</div>
              <p className="text-sm opacity-90 mt-2">
                {riskLevel === "good" && "You're on track with your nutrition goals!"}
                {riskLevel === "warning" && "Some nutrients are below target."}
                {riskLevel === "danger" && "Multiple nutrients need attention."}
              </p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant="secondary">
                  Get Food Suggestions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Personalized Food Suggestions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Recommended foods for your {profile?.user_type || 'general'} nutrition plan:
                  </p>
                  <div className="space-y-2">
                    <h4 className="font-medium">Recommended Foods:</h4>
                    <ul className="space-y-1 text-sm">
                      {userFoodSuggestions.map((food, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {food}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {analytics && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Weekly Insights</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Consistency: {Math.round(analytics.trends.consistency_score)}%</p>
                        <p>Avg Daily Calories: {Math.round(analytics.averages.avg_calories)}</p>
                        <p>Trend: {
                          analytics.trends.calories_trend === 'increasing' ? '📈 Increasing' : 
                          analytics.trends.calories_trend === 'decreasing' ? '📉 Decreasing' : 
                          '➡️ Stable'
                        }</p>
                        <p>Total Meals: {analytics.trends.total_meals_logged}</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
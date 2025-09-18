import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Flame, 
  Wheat, 
  Droplets, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

const nutritionData = {
  calories: { current: 1850, target: 2200 },
  carbs: { current: 180, target: 275 },
  fats: { current: 65, target: 97 },
  proteins: { current: 120, target: 165 }
};

const riskLevel: "good" | "warning" | "danger" = "good";

const foodSuggestions = {
  normal: [
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
  diabetic: [
    "Grilled salmon with steamed broccoli",
    "Cauliflower rice with chicken",
    "Sugar-free Greek yogurt",
    "Nuts and seeds mix"
  ]
};

export default function Dashboard() {
  const getNutritionProgress = (current: number, target: number) => 
    Math.min((current / target) * 100, 100);

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Track your daily nutrition goals</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Today:</span>
          <Badge variant="outline" className="text-primary">
            {new Date().toLocaleDateString()}
          </Badge>
        </div>
      </div>

      {/* Nutrition Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calories</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.calories.current}</div>
            <Progress 
              value={getNutritionProgress(nutritionData.calories.current, nutritionData.calories.target)} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              of {nutritionData.calories.target} kcal
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carbs</CardTitle>
            <Wheat className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.carbs.current}g</div>
            <Progress 
              value={getNutritionProgress(nutritionData.carbs.current, nutritionData.carbs.target)} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              of {nutritionData.carbs.target}g
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fats</CardTitle>
            <Droplets className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.fats.current}g</div>
            <Progress 
              value={getNutritionProgress(nutritionData.fats.current, nutritionData.fats.target)} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              of {nutritionData.fats.target}g
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proteins</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nutritionData.proteins.current}g</div>
            <Progress 
              value={getNutritionProgress(nutritionData.proteins.current, nutritionData.proteins.target)} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              of {nutritionData.proteins.target}g
            </p>
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
            <div className="h-48 flex items-end justify-between gap-2 px-4">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <div 
                    className="bg-primary/20 rounded-t-lg w-8 transition-all hover:bg-primary/30"
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Normal</Button>
                    <Button variant="outline" size="sm">Gym</Button>
                    <Button variant="outline" size="sm">Diabetic</Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Recommended Foods:</h4>
                    <ul className="space-y-1 text-sm">
                      {foodSuggestions.normal.map((food, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {food}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
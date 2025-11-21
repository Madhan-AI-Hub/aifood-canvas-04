import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useActivityData } from "@/hooks/useActivityData";
import { useProfile } from "@/contexts/ProfileContext";
import { googleFitAPI } from "@/lib/googleFitIntegration";
import { appleHealthAPI } from "@/lib/appleHealthSimulation";
import { calculateNutritionGoalsWithActivity } from "@/lib/nutritionCalculations";
import { 
  Heart, 
  Footprints, 
  Activity,
  TrendingUp,
  Bluetooth,
  Wifi,
  Smartphone,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Target,
  BarChart3,
  Flame,
  XCircle
} from "lucide-react";

export default function SmartDevice() {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [newExercise, setNewExercise] = useState({
    type: '',
    duration: '',
    calories: '',
    intensity: 'moderate' as 'light' | 'moderate' | 'vigorous'
  });

  const { toast } = useToast();
  const { profile } = useProfile();
  const {
    todayActivity,
    weeklyActivity,
    devices,
    goals,
    loading,
    error,
    devicesLoading,
    refetchActivity,
    connectDevice,
    disconnectDevice,
    syncDeviceData,
    updateActivity,
    addExerciseSession,
    updateGoals
  } = useActivityData();

  // Connect to a smart device
  const handleConnectDevice = async (deviceType: 'google_fit' | 'apple_health') => {
    try {
      setIsConnecting(deviceType);

      if (deviceType === 'google_fit') {
        if (!googleFitAPI.isConfigured()) {
          toast({
            title: "Google Fit Not Configured",
            description: "Google Fit requires API setup.",
            variant: "destructive"
          });
          setIsConnecting(null);
          return;
        }
        const success = await googleFitAPI.authenticate();
        if (success) {
          await connectDevice(deviceType, 'Google Fit');
          await handleSyncData(deviceType);
        } else {
          throw new Error('Failed to authenticate with Google Fit');
        }
      } else if (deviceType === 'apple_health') {
        const success = await appleHealthAPI.connect();
        if (success) {
          await connectDevice(deviceType, 'Apple Health (Simulated)');
          await handleSyncData(deviceType);
        } else {
          throw new Error('Failed to connect to Apple Health');
        }
      }

      setConnectDialogOpen(false);
    } catch (error) {
      console.error('Device connection failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsConnecting(null);
    }
  };

  // Sync data from connected devices
  const handleSyncData = async (deviceType: 'google_fit' | 'apple_health' | 'fitbit' | 'garmin' | 'samsung_health') => {
    try {
      const today = new Date();
      
      if (deviceType === 'google_fit' && googleFitAPI.isAuthenticated()) {
        const data = await googleFitAPI.fetchFitnessData(today, today);
        if (data) {
          await updateActivity(today.toISOString().split('T')[0], data);
        }
      } else if (deviceType === 'apple_health' && appleHealthAPI.isHealthConnected()) {
        const data = await appleHealthAPI.fetchHealthData(today);
        if (data) {
          await updateActivity(today.toISOString().split('T')[0], data);
        }
      }
      // For other device types, we'll use the existing syncDeviceData
      
      await syncDeviceData(deviceType);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  // Add manual exercise session
  const handleAddExercise = async () => {
    try {
      if (!newExercise.type || !newExercise.duration || !newExercise.calories) {
        toast({
          title: "Missing Information",
          description: "Please fill in all exercise details.",
          variant: "destructive"
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const startTime = new Date(now.getTime() - parseInt(newExercise.duration) * 60000);

      const session = {
        exercise_type: newExercise.type,
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        duration_minutes: parseInt(newExercise.duration),
        calories_burned: parseInt(newExercise.calories),
        exercise_intensity: newExercise.intensity
      };

      await addExerciseSession(today, session);
      
      setExerciseDialogOpen(false);
      setNewExercise({ type: '', duration: '', calories: '', intensity: 'moderate' });
    } catch (error) {
      console.error('Failed to add exercise:', error);
    }
  };

  // Calculate activity level for TDEE
  const calculateActivityStats = () => {
    if (!todayActivity || !goals) return null;

    const stepsProgress = (todayActivity.steps / goals.daily_steps_goal) * 100;
    const activeMinutesProgress = (todayActivity.active_minutes / goals.daily_active_minutes_goal) * 100;
    const caloriesProgress = (todayActivity.calories_burned / goals.daily_calories_goal) * 100;

    const averageProgress = (stepsProgress + activeMinutesProgress + caloriesProgress) / 3;
    
    let activityLevel = 'Low';
    if (averageProgress >= 80) activityLevel = 'Very High';
    else if (averageProgress >= 60) activityLevel = 'High';
    else if (averageProgress >= 40) activityLevel = 'Moderate';

    return {
      stepsProgress: Math.min(100, stepsProgress),
      activeMinutesProgress: Math.min(100, activeMinutesProgress),
      caloriesProgress: Math.min(100, caloriesProgress),
      averageProgress: Math.min(100, averageProgress),
      activityLevel
    };
  };

  // Calculate updated nutrition goals with activity data
  const calculateUpdatedNutrition = useCallback(async () => {
    if (!profile || !todayActivity) return null;

    try {
      const weeklyStats = weeklyActivity.reduce((acc, day) => ({
        totalSteps: acc.totalSteps + day.steps,
        totalActiveMinutes: acc.totalActiveMinutes + day.active_minutes,
        totalExerciseCalories: acc.totalExerciseCalories + day.calories_burned,
        totalSessions: acc.totalSessions + (day.exercise_sessions?.length || 0)
      }), { totalSteps: 0, totalActiveMinutes: 0, totalExerciseCalories: 0, totalSessions: 0 });

      const activityData = {
        averageSteps: Math.round(weeklyStats.totalSteps / 7),
        averageActiveMinutes: Math.round(weeklyStats.totalActiveMinutes / 7),
        averageExerciseCalories: Math.round(weeklyStats.totalExerciseCalories / 7),
        weeklyExerciseSessions: weeklyStats.totalSessions
      };

      return calculateNutritionGoalsWithActivity(profile, activityData);
    } catch (error) {
      console.error('Failed to calculate updated nutrition:', error);
      return null;
    }
  }, [profile, todayActivity, weeklyActivity]);

  const stats = calculateActivityStats();
  const [updatedNutrition, setUpdatedNutrition] = useState<{
    daily_calories: number;
    daily_carbs: number;
    daily_fats: number;
    daily_proteins: number;
    activityMultiplier: number;
    isActivityBased: boolean;
  } | null>(null);

  useEffect(() => {
    // Initialize Google Fit API if configured
    const initializeGoogleFit = async () => {
      try {
        if (googleFitAPI.isConfigured()) {
          await googleFitAPI.initialize();
        }
      } catch (error) {
        console.warn('Google Fit initialization failed:', error);
      }
    };
    
    initializeGoogleFit();
  }, []);

  useEffect(() => {
    const updateNutrition = async () => {
      const result = await calculateUpdatedNutrition();
      setUpdatedNutrition(result);
    };
    
    if (profile && todayActivity) {
      updateNutrition();
    }
  }, [profile, todayActivity, weeklyActivity, calculateUpdatedNutrition]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="h-8 w-8 animate-spin text-fitness-primary" />
          <span className="ml-2 text-fitness-light">Loading activity data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Smart Device Integration</h1>
          <p className="text-fitness-light">Connect your fitness trackers and health apps for personalized insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={refetchActivity} 
            variant="outline" 
            size="sm"
            className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button className="fitness-button">
                <Plus className="w-4 h-4 mr-2" />
                Connect Device
              </Button>
            </DialogTrigger>
            <DialogContent className="fitness-card border-0">
              <DialogHeader>
                <DialogTitle className="text-white">Connect Smart Device</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid gap-4">
                  <Button
                    onClick={() => handleConnectDevice('google_fit')}
                    disabled={isConnecting === 'google_fit'}
                    className="w-full justify-start h-auto p-4 bg-fitness-dark border border-fitness-muted/20 hover:bg-fitness-muted/20 text-white"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-6 h-6 text-blue-500" />
                      <div className="text-left">
                        <div className="font-semibold">Google Fit</div>
                        <div className="text-sm text-fitness-light">Connect Android fitness data</div>
                      </div>
                      {isConnecting === 'google_fit' && (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                      )}
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleConnectDevice('apple_health')}
                    disabled={isConnecting === 'apple_health'}
                    className="w-full justify-start h-auto p-4 bg-fitness-dark border border-fitness-muted/20 hover:bg-fitness-muted/20 text-white"
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="w-6 h-6 text-red-500" />
                      <div className="text-left">
                        <div className="font-semibold">Apple Health (Simulated)</div>
                        <div className="text-sm text-fitness-light">Connect iOS health data</div>
                      </div>
                      {isConnecting === 'apple_health' && (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                      )}
                    </div>
                  </Button>
                </div>

                <div className="text-xs text-fitness-muted p-3 bg-fitness-dark/30 rounded-lg">
                  <p className="font-semibold mb-1">Privacy Notice</p>
                  <p>Your health data is encrypted and stored securely. We only access activity data to provide personalized nutrition recommendations.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="fitness-card border-0">
              <DialogHeader>
                <DialogTitle className="text-white">Log Exercise Session</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid gap-4">
                  <div>
                    <Label className="text-white">Exercise Type</Label>
                    <Select value={newExercise.type} onValueChange={(value) => setNewExercise(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger className="fitness-input">
                        <SelectValue placeholder="Select exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="walking">Walking</SelectItem>
                        <SelectItem value="cycling">Cycling</SelectItem>
                        <SelectItem value="weightlifting">Weight Lifting</SelectItem>
                        <SelectItem value="yoga">Yoga</SelectItem>
                        <SelectItem value="swimming">Swimming</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={newExercise.duration}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, duration: e.target.value }))}
                      className="fitness-input"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Calories Burned</Label>
                    <Input
                      type="number"
                      value={newExercise.calories}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, calories: e.target.value }))}
                      className="fitness-input"
                      placeholder="300"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Intensity</Label>
                    <Select value={newExercise.intensity} onValueChange={(value: 'light' | 'moderate' | 'vigorous') => setNewExercise(prev => ({ ...prev, intensity: value }))}>
                      <SelectTrigger className="fitness-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="vigorous">Vigorous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAddExercise} className="w-full fitness-button">
                  Add Exercise Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-500/20 bg-red-500/10">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-200">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Today's Activity Overview */}
      {todayActivity ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Steps */}
          <Card className="fitness-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Steps Today</CardTitle>
              <Footprints className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {todayActivity.steps.toLocaleString()}
              </div>
              {goals && (
                <>
                  <Progress 
                    value={stats?.stepsProgress || 0} 
                    className="mt-2" 
                  />
                  <div className="flex justify-between text-xs text-fitness-light mt-1">
                    <span>{(todayActivity.distance_meters / 1000).toFixed(1)} km</span>
                    <span>Goal: {goals.daily_steps_goal.toLocaleString()}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Minutes */}
          <Card className="fitness-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Active Minutes</CardTitle>
              <Activity className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {todayActivity.active_minutes}
                <span className="text-sm font-normal text-fitness-light ml-1">min</span>
              </div>
              {goals && (
                <>
                  <Progress 
                    value={stats?.activeMinutesProgress || 0} 
                    className="mt-2" 
                  />
                  <div className="flex justify-between text-xs text-fitness-light mt-1">
                    <span>{stats?.activityLevel || 'Unknown'} Activity</span>
                    <span>Goal: {goals.daily_active_minutes_goal} min</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Calories Burned */}
          <Card className="fitness-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Calories Burned</CardTitle>
              <Flame className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {Math.round(todayActivity.calories_burned)}
                <span className="text-sm font-normal text-fitness-light ml-1">cal</span>
              </div>
              {goals && (
                <>
                  <Progress 
                    value={stats?.caloriesProgress || 0} 
                    className="mt-2" 
                  />
                  <div className="flex justify-between text-xs text-fitness-light mt-1">
                    <span>{todayActivity.exercise_sessions?.length || 0} workouts</span>
                    <span>Goal: {goals.daily_calories_goal} cal</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Heart Rate */}
          <Card className="fitness-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Heart Rate</CardTitle>
              <Heart className="h-5 w-5 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {todayActivity.heart_rate_avg || '--'}
                <span className="text-sm font-normal text-fitness-light ml-1">BPM</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {todayActivity.heart_rate_avg && (
                  <Badge 
                    variant={todayActivity.heart_rate_avg <= 100 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {todayActivity.heart_rate_avg <= 100 ? 'Normal' : 'Elevated'}
                  </Badge>
                )}
                <span className="text-xs text-fitness-light">
                  Resting: {todayActivity.heart_rate_resting || '--'} BPM
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="fitness-card">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="w-12 h-12 text-fitness-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Activity Data</h3>
              <p className="text-fitness-light mb-4">Connect a device or manually log your activities to get started</p>
              <Button onClick={() => setConnectDialogOpen(true)} className="fitness-button">
                Connect Device
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Management and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Devices */}
        <Card className="fitness-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Bluetooth className="h-5 w-5 text-fitness-primary" />
              Connected Devices
            </CardTitle>
            <Badge variant="outline" className="border-fitness-primary text-fitness-primary">
              {devices.filter(d => d.connection_status === 'connected').length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {devicesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-fitness-primary" />
              </div>
            ) : devices.length > 0 ? (
              devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-fitness-dark/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      device.connection_status === "connected" ? "bg-green-500" : 
                      device.connection_status === "error" ? "bg-red-500" : "bg-gray-500"
                    }`} />
                    <div>
                      <p className="font-medium text-sm text-white">
                        {device.device_name || device.device_type}
                      </p>
                      <p className="text-xs text-fitness-light capitalize">
                        {device.connection_status} • 
                        {device.last_sync_at ? 
                          ` Last sync: ${new Date(device.last_sync_at).toLocaleTimeString()}` :
                          ' Never synced'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.connection_status === 'connected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSyncData(device.device_type)}
                        className="border-fitness-muted text-fitness-light hover:bg-fitness-muted/20"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => disconnectDevice(device.id)}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Smartphone className="w-8 h-8 text-fitness-muted mx-auto mb-2" />
                <p className="text-sm text-fitness-light">No devices connected</p>
                <p className="text-xs text-fitness-muted">Connect a device to start tracking</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Activity Trends */}
        <Card className="lg:col-span-2 fitness-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-fitness-primary" />
              Weekly Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyActivity.length > 0 ? (
              <div className="space-y-4">
                {/* Steps Trend */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white">Average Daily Steps</span>
                    <span className="text-sm text-fitness-light">
                      {Math.round(weeklyActivity.reduce((acc, day) => acc + day.steps, 0) / weeklyActivity.length).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-fitness-dark rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{
                      width: `${Math.min(100, (weeklyActivity.reduce((acc, day) => acc + day.steps, 0) / weeklyActivity.length / (goals?.daily_steps_goal || 10000)) * 100)}%`
                    }} />
                  </div>
                </div>

                {/* Active Minutes Trend */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white">Average Active Minutes</span>
                    <span className="text-sm text-fitness-light">
                      {Math.round(weeklyActivity.reduce((acc, day) => acc + day.active_minutes, 0) / weeklyActivity.length)} min
                    </span>
                  </div>
                  <div className="h-2 bg-fitness-dark rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full" style={{
                      width: `${Math.min(100, (weeklyActivity.reduce((acc, day) => acc + day.active_minutes, 0) / weeklyActivity.length / (goals?.daily_active_minutes_goal || 60)) * 100)}%`
                    }} />
                  </div>
                </div>

                {/* Calories Trend */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white">Average Calories Burned</span>
                    <span className="text-sm text-fitness-light">
                      {Math.round(weeklyActivity.reduce((acc, day) => acc + day.calories_burned, 0) / weeklyActivity.length)} cal
                    </span>
                  </div>
                  <div className="h-2 bg-fitness-dark rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{
                      width: `${Math.min(100, (weeklyActivity.reduce((acc, day) => acc + day.calories_burned, 0) / weeklyActivity.length / (goals?.daily_calories_goal || 300)) * 100)}%`
                    }} />
                  </div>
                </div>

                {/* Activity Level Impact */}
                {updatedNutrition && (
                  <div className="mt-6 p-4 bg-fitness-dark/30 rounded-lg border border-fitness-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-fitness-primary" />
                      <span className="text-sm font-medium text-white">Activity-Based Nutrition Update</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-fitness-light">Activity Level:</p>
                        <p className="font-semibold text-white">{updatedNutrition.activityMultiplier}x BMR</p>
                      </div>
                      <div>
                        <p className="text-fitness-light">Updated Calories:</p>
                        <p className="font-semibold text-white">{Math.round(updatedNutrition.daily_calories)} kcal/day</p>
                      </div>
                    </div>
                    <p className="text-xs text-fitness-muted mt-2">
                      Your nutrition goals are automatically adjusted based on your actual activity level.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-fitness-muted mx-auto mb-2" />
                <p className="text-sm text-fitness-light">No weekly data available</p>
                <p className="text-xs text-fitness-muted">Activity trends will appear after a few days of tracking</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  Moon, 
  Footprints, 
  Activity,
  Zap,
  TrendingUp,
  Bluetooth,
  Wifi
} from "lucide-react";

const deviceData = {
  heartRate: {
    current: 72,
    status: "normal",
    lastUpdate: "2 min ago"
  },
  sleep: {
    hours: 7.5,
    quality: "good",
    lastNight: "7h 30m"
  },
  steps: {
    current: 8420,
    target: 10000,
    distance: "6.2 km"
  },
  activity: {
    activeMinutes: 45,
    target: 60,
    calories: 320
  }
};

const connectedDevices = [
  { name: "Apple Watch Series 9", status: "connected", battery: 85 },
  { name: "Fitbit Charge 5", status: "connected", battery: 62 },
  { name: "Smart Scale", status: "disconnected", battery: null }
];

export default function SmartDevice() {
  const getHeartRateColor = (rate: number) => {
    if (rate < 60) return "text-blue-500";
    if (rate <= 100) return "text-success";
    return "text-warning";
  };

  const getSleepQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent": return "text-success";
      case "good": return "text-primary";
      case "fair": return "text-warning";
      case "poor": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Smart Device</h1>
          <p className="text-muted-foreground">Monitor your health metrics in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-success">
            <div className="w-2 h-2 rounded-full bg-success mr-2" />
            3 Devices Connected
          </Badge>
        </div>
      </div>

      {/* Health Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heart Rate</CardTitle>
            <Heart className={`h-5 w-5 ${getHeartRateColor(deviceData.heartRate.current)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deviceData.heartRate.current}
              <span className="text-sm font-normal text-muted-foreground ml-1">BPM</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant={deviceData.heartRate.status === "normal" ? "default" : "destructive"}
                className="text-xs"
              >
                {deviceData.heartRate.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {deviceData.heartRate.lastUpdate}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sleep */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep Time</CardTitle>
            <Moon className={`h-5 w-5 ${getSleepQualityColor(deviceData.sleep.quality)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deviceData.sleep.hours}
              <span className="text-sm font-normal text-muted-foreground ml-1">hours</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant={deviceData.sleep.quality === "good" ? "default" : "secondary"}
                className="text-xs capitalize"
              >
                {deviceData.sleep.quality}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last night: {deviceData.sleep.lastNight}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Steps Count</CardTitle>
            <Footprints className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deviceData.steps.current.toLocaleString()}</div>
            <Progress 
              value={(deviceData.steps.current / deviceData.steps.target) * 100} 
              className="mt-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{deviceData.steps.distance}</span>
              <span>Goal: {deviceData.steps.target.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="gradient-card border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Minutes</CardTitle>
            <Activity className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deviceData.activity.activeMinutes}
              <span className="text-sm font-normal text-muted-foreground ml-1">min</span>
            </div>
            <Progress 
              value={(deviceData.activity.activeMinutes / deviceData.activity.target) * 100} 
              className="mt-2" 
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{deviceData.activity.calories} cal</span>
              <span>Goal: {deviceData.activity.target} min</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Status and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Devices */}
        <Card className="lg:col-span-1 gradient-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5" />
              Connected Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectedDevices.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    device.status === "connected" ? "bg-success" : "bg-destructive"
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{device.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{device.status}</p>
                  </div>
                </div>
                {device.battery && (
                  <Badge variant="outline" className="text-xs">
                    {device.battery}%
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Health Trends */}
        <Card className="lg:col-span-2 gradient-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Health Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Heart Rate Trend */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Average Heart Rate</span>
                  <span className="text-sm text-muted-foreground">74 BPM</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-success to-primary w-3/4 rounded-full" />
                </div>
              </div>

              {/* Sleep Trend */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Average Sleep</span>
                  <span className="text-sm text-muted-foreground">7.2 hours</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-4/5 rounded-full" />
                </div>
              </div>

              {/* Steps Trend */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Daily Steps Goal</span>
                  <span className="text-sm text-muted-foreground">84%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 w-5/6 rounded-full" />
                </div>
              </div>

              {/* Activity Trend */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Activity Goal</span>
                  <span className="text-sm text-muted-foreground">75%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-pink-500 w-3/4 rounded-full" />
                </div>
              </div>
            </div>

            {/* Sync Status */}
            <div className="mt-6 p-3 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center gap-2 text-success">
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">Last sync: Just now</span>
              </div>
              <p className="text-xs text-success/80 mt-1">
                All devices are synced and up to date
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
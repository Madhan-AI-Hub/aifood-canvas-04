import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Edit3, 
  Calendar, 
  Target, 
  Activity,
  Heart,
  Scale,
  Ruler,
  Save,
  Camera
} from "lucide-react";

const userProfile = {
  name: "Alex Johnson",
  email: "alex.johnson@email.com",
  age: 28,
  userType: "Gym",
  height: "5'10\"",
  weight: "165 lbs",
  targetWeight: "170 lbs",
  activityLevel: "Active",
  goals: "Build muscle and maintain healthy diet",
  joinDate: "January 2024",
  profileImage: null
};

const userTypeOptions = [
  { value: "normal", label: "Normal", description: "General healthy eating" },
  { value: "gym", label: "Gym", description: "Fitness and muscle building focus" },
  { value: "diabetic", label: "Diabetic", description: "Blood sugar management" }
];

const activityLevels = [
  { value: "sedentary", label: "Sedentary", description: "Little to no exercise" },
  { value: "light", label: "Light", description: "Light exercise 1-3 days/week" },
  { value: "moderate", label: "Moderate", description: "Moderate exercise 3-5 days/week" },
  { value: "active", label: "Active", description: "Heavy exercise 6-7 days/week" },
  { value: "very-active", label: "Very Active", description: "Very heavy exercise, physical job" }
];

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);

  const handleSave = () => {
    // Simulate saving profile
    console.log("Saving profile:", editedProfile);
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setIsEditing(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <Badge variant="outline" className="text-primary w-fit">
          Member since {userProfile.joinDate}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 gradient-card border border-border">
          <CardHeader className="text-center">
            <div className="relative mx-auto">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarImage src={userProfile.profileImage || undefined} />
                <AvatarFallback className="text-2xl bg-primary/20">
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
                onClick={() => alert("Upload photo functionality")}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{userProfile.name}</h3>
              <p className="text-muted-foreground">{userProfile.email}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-semibold">{userProfile.age}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-semibold">{userProfile.userType}</p>
              </div>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={editedProfile.age}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>User Type</Label>
                    <Select
                      value={editedProfile.userType.toLowerCase()}
                      onValueChange={(value) => setEditedProfile(prev => ({ 
                        ...prev, 
                        userType: userTypeOptions.find(opt => opt.value === value)?.label || value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <p className="font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button onClick={handleCancel} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Details and Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Physical Stats */}
          <Card className="gradient-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Physical Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Ruler className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Height</p>
                  <p className="font-semibold">{userProfile.height}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Scale className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">Current Weight</p>
                  <p className="font-semibold">{userProfile.weight}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Target className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm text-muted-foreground">Target Weight</p>
                  <p className="font-semibold">{userProfile.targetWeight}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Activity Level</p>
                  <p className="font-semibold">{userProfile.activityLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goals and Preferences */}
          <Card className="gradient-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Goals & Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Health Goals</Label>
                <p className="text-sm text-muted-foreground mt-1">{userProfile.goals}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Dietary Preference</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {userProfile.userType === "Gym" ? "High protein, balanced macros" :
                     userProfile.userType === "Diabetic" ? "Low glycemic, controlled carbs" :
                     "Balanced, general nutrition"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Activity Focus</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {userProfile.userType === "Gym" ? "Strength training & muscle building" :
                     userProfile.userType === "Diabetic" ? "Gentle exercise & blood sugar control" :
                     "General fitness & wellness"}
                  </p>
                </div>
              </div>

              <Button variant="outline" className="w-full sm:w-auto">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Goals & Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card className="gradient-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Notifications</p>
                  <p className="text-xs text-muted-foreground">Daily reminders and tips</p>
                </div>
                <Badge variant="secondary">Enabled</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Data Privacy</p>
                  <p className="text-xs text-muted-foreground">Personal information settings</p>
                </div>
                <Badge variant="secondary">Secure</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Connected Devices</p>
                  <p className="text-xs text-muted-foreground">Sync health data</p>
                </div>
                <Badge variant="outline">3 devices</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
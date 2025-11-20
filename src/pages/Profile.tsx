import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile, UserProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  User, 
  Edit3, 
  Target, 
  Activity,
  Heart,
  Scale,
  Ruler,
  Save,
  Camera,
  Loader2,
  Users,
  Utensils,
  Bug,
  Database
} from "lucide-react";

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" }
];

const activityLevels = [
  { value: "sedentary", label: "Sedentary", description: "Little/no exercise" },
  { value: "lightly-active", label: "Lightly Active", description: "Light exercise 1-3 days/week" },
  { value: "moderately-active", label: "Moderately Active", description: "Moderate exercise 3-5 days/week" },
  { value: "very-active", label: "Very Active", description: "Hard exercise 6-7 days/week" },
  { value: "extra-active", label: "Extra Active", description: "Very hard exercise & physical job" }
];

const healthGoals = [
  { value: "weight-loss", label: "Weight Loss" },
  { value: "weight-gain", label: "Weight Gain" },
  { value: "muscle-building", label: "Muscle Building" },
  { value: "maintenance", label: "Weight Maintenance" },
  { value: "general-health", label: "General Health & Wellness" },
  { value: "athletic-performance", label: "Athletic Performance" }
];

const dietPreferences = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Ketogenic" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "low-carb", label: "Low Carb" },
  { value: "other", label: "Other" }
];

const activityGoals = [
  { value: "increase-cardio", label: "Increase Cardio Fitness" },
  { value: "build-strength", label: "Build Strength" },
  { value: "improve-flexibility", label: "Improve Flexibility" },
  { value: "lose-fat", label: "Lose Body Fat" },
  { value: "gain-muscle", label: "Gain Muscle Mass" },
  { value: "sports-performance", label: "Improve Sports Performance" },
  { value: "general-fitness", label: "General Fitness" },
  { value: "injury-recovery", label: "Injury Recovery" }
];

export default function Profile() {
  const [isSaving, setIsSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { profile, loading, updateProfile, refreshProfile, isProfileComplete } = useProfile();
  const { user } = useAuth();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const success = await updateProfile(editedProfile);
      
      if (success) {
        setDialogOpen(false);
        setEditedProfile({});
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setDialogOpen(false);
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const debugProfileData = async () => {
    try {
      console.log('=== SUPABASE DEBUG START ===');
      
      // 1. Check Supabase client configuration
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase client:', supabase);
      
      // 2. Check user authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Auth user:', user);
      console.log('Auth error:', userError);
      
      if (!user) {
        toast({
          title: "Debug Result",
          description: "No authenticated user found",
          variant: "destructive",
        });
        return;
      }

      // 3. Test basic table access (this will reveal schema cache issues)
      console.log('Testing profiles table access...');
      const { data: tableTest, error: tableError } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1);
        
      console.log('Table count test:', tableTest);
      console.log('Table error (schema cache issue?):', tableError);
      
      if (tableError) {
        console.log('Table error code:', tableError.code);
        console.log('Table error message:', tableError.message);
        console.log('Table error details:', tableError.details);
        console.log('Table error hint:', tableError.hint);
        
        // Check if it's a schema cache issue
        if (tableError.message?.includes('schema cache') || tableError.code === '42P01') {
          toast({
            title: "Schema Cache Issue Detected",
            description: "The profiles table may not exist. Check the SQL migration in your Supabase dashboard.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Database Error",
            description: `Error: ${tableError.message}`,
            variant: "destructive",
          });
        }
      } else {
        // 4. Test user-specific query
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id);
        
        console.log('User profile query:', profile);
        console.log('Profile error:', profileError);
        
        // 5. Test RLS policies
        const { data: rlsTest, error: rlsError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        console.log('RLS test result:', rlsTest);
        console.log('RLS test error:', rlsError);
        
        toast({
          title: "Debug Complete",
          description: "Check console for detailed results. Table exists and accessible.",
        });
      }
      
      console.log('=== SUPABASE DEBUG END ===');
    } catch (error) {
      console.error('Debug error:', error);
      toast({
        title: "Debug Error",
        description: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const checkDatabaseSetup = async () => {
    try {
      console.log('Checking database setup...');
      
      // Try to query the profiles table structure
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log('Table query error:', error);
        
        if (error.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "The profiles table doesn't exist. Please run the migration in your Supabase SQL Editor.",
            variant: "destructive",
          });
          
          // Show the SQL in console
          console.log('Run this SQL in your Supabase SQL Editor to create the profiles table');
        } else {
          toast({
            title: "Database Error",
            description: `Error: ${error.message}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Database OK",
          description: "Profiles table exists and is accessible.",
        });
      }
    } catch (error) {
      console.error('Database check error:', error);
      toast({
        title: "Database Check Failed",
        description: `Error checking database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Initialize edited profile when dialog opens
  const handleEditClick = () => {
    setEditedProfile(profile || {});
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
          {!isProfileComplete && (
            <Badge variant="outline" className="text-orange-500 border-orange-500 mt-2">
              Please complete your profile for better recommendations
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-primary w-fit">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkDatabaseSetup}
            className="text-xs"
            disabled={loading}
          >
            <Database className="h-3 w-3 mr-1" />
            Check DB
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={debugProfileData}
            className="text-xs"
          >
            <Bug className="h-3 w-3 mr-1" />
            Debug
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 gradient-card border border-border">
          <CardHeader className="text-center">
            <div className="relative mx-auto">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarFallback className="text-2xl bg-primary/20">
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
                onClick={() => alert("Upload photo functionality coming soon!")}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{profile?.full_name || 'Your Name'}</h3>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-semibold">{profile?.age || '-'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-semibold">{genderOptions.find(g => g.value === profile?.gender)?.label || '-'}</p>
              </div>
            </div>
            
            <Button className="w-full" variant="outline" onClick={handleEditClick}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
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
                  <p className="font-semibold">{profile?.height ? `${profile.height} cm` : '-'}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Scale className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground">Current Weight</p>
                  <p className="font-semibold">{profile?.weight ? `${profile.weight} kg` : '-'}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Target className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm text-muted-foreground">Target Weight</p>
                  <p className="font-semibold">{profile?.target_weight ? `${profile.target_weight} kg` : '-'}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Activity Level</p>
                  <p className="font-semibold">{activityLevels.find(a => a.value === profile?.activity_level)?.label || '-'}</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Health Goals
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {healthGoals.find(g => g.value === profile?.health_goals)?.label || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Diet Preference
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dietPreferences.find(d => d.value === profile?.diet_preference)?.label || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity Goals
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activityGoals.find(a => a.value === profile?.activity_goals)?.label || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Activity Level
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activityLevels.find(a => a.value === profile?.activity_level)?.description || 'Not specified'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editedProfile.full_name || ''}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={editedProfile.age || ''}
                    onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  value={editedProfile.gender || ''} 
                  onValueChange={(value) => handleInputChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Physical Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Physical Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={editedProfile.height || ''}
                    onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={editedProfile.weight || ''}
                    onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_weight">Target Weight (kg)</Label>
                  <Input
                    id="target_weight"
                    type="number"
                    value={editedProfile.target_weight || ''}
                    onChange={(e) => handleInputChange('target_weight', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select 
                  value={editedProfile.activity_level || ''} 
                  onValueChange={(value) => handleInputChange('activity_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityLevels.map(option => (
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
            </div>

            {/* Goals and Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Goals & Preferences</h3>
              
              <div className="space-y-2">
                <Label>Health Goals</Label>
                <Select 
                  value={editedProfile.health_goals || ''} 
                  onValueChange={(value) => handleInputChange('health_goals', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select health goals" />
                  </SelectTrigger>
                  <SelectContent>
                    {healthGoals.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Diet Preference</Label>
                <Select 
                  value={editedProfile.diet_preference || ''} 
                  onValueChange={(value) => handleInputChange('diet_preference', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select diet preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {dietPreferences.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Activity Goals</Label>
                <Select 
                  value={editedProfile.activity_goals || ''} 
                  onValueChange={(value) => handleInputChange('activity_goals', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity goals" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityGoals.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
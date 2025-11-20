import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Dumbbell, 
  Heart, 
  Footprints, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Loader2,
  User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    targetWeight: "",
    activityLevel: "",
    healthGoals: "",
    dietPreference: "",
    activityGoals: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            age: parseInt(formData.age),
            gender: formData.gender,
            height: parseFloat(formData.height),
            weight: parseFloat(formData.weight),
            target_weight: parseFloat(formData.targetWeight),
            activity_level: formData.activityLevel,
            health_goals: formData.healthGoals,
            diet_preference: formData.dietPreference,
            activity_goals: formData.activityGoals
          }
        }
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
        navigate("/login");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider: 'google' | 'facebook') => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full fitness-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Tagline */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-fitness-primary">
              <Dumbbell className="h-8 w-8" />
              <Heart className="h-6 w-6" />
              <Footprints className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Nutrition Analyzer</h1>
          <p className="text-fitness-light text-lg font-medium">Track. Train. Transform.</p>
        </div>

        {/* Signup Card */}
        <Card className="fitness-card shadow-elevated animate-slide-in-up border-0">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-2xl font-bold text-center text-white">Create Account</h2>
            <p className="text-fitness-light text-center">Start your fitness transformation journey</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-fitness-muted" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="fitness-input pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-fitness-muted" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="fitness-input pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-fitness-muted" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="fitness-input pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0 text-fitness-muted hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-fitness-muted" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="fitness-input pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0 text-fitness-muted hover:text-white"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-4 pt-4 border-t border-fitness-muted/20">
                <h3 className="text-white font-semibold text-lg">Personal Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-white font-medium">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      placeholder="Your age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="fitness-input"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-white font-medium">Gender</Label>
                    <Select onValueChange={(value) => handleSelectChange("gender", value)} required>
                      <SelectTrigger className="fitness-input">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height" className="text-white font-medium">Height (cm)</Label>
                    <Input
                      id="height"
                      name="height"
                      type="number"
                      placeholder="Your height"
                      value={formData.height}
                      onChange={handleInputChange}
                      className="fitness-input"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-white font-medium">Current Weight (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      placeholder="Current weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      className="fitness-input"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetWeight" className="text-white font-medium">Target Weight (kg)</Label>
                  <Input
                    id="targetWeight"
                    name="targetWeight"
                    type="number"
                    placeholder="Your target weight"
                    value={formData.targetWeight}
                    onChange={handleInputChange}
                    className="fitness-input"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activityLevel" className="text-white font-medium">Activity Level</Label>
                  <Select onValueChange={(value) => handleSelectChange("activityLevel", value)} required>
                    <SelectTrigger className="fitness-input">
                      <SelectValue placeholder="Select activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                      <SelectItem value="lightly-active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                      <SelectItem value="moderately-active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                      <SelectItem value="very-active">Very Active (hard exercise 6-7 days/week)</SelectItem>
                      <SelectItem value="extra-active">Extra Active (very hard exercise & physical job)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Health & Goals Section */}
              <div className="space-y-4 pt-4 border-t border-fitness-muted/20">
                <h3 className="text-white font-semibold text-lg">Health & Goals</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="healthGoals" className="text-white font-medium">Primary Health Goal</Label>
                  <Select onValueChange={(value) => handleSelectChange("healthGoals", value)} required>
                    <SelectTrigger className="fitness-input">
                      <SelectValue placeholder="Select your primary goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight-loss">Weight Loss</SelectItem>
                      <SelectItem value="weight-gain">Weight Gain</SelectItem>
                      <SelectItem value="muscle-building">Muscle Building</SelectItem>
                      <SelectItem value="maintenance">Weight Maintenance</SelectItem>
                      <SelectItem value="general-health">General Health & Wellness</SelectItem>
                      <SelectItem value="athletic-performance">Athletic Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dietPreference" className="text-white font-medium">Diet Preference</Label>
                  <Select onValueChange={(value) => handleSelectChange("dietPreference", value)} required>
                    <SelectTrigger className="fitness-input">
                      <SelectValue placeholder="Select diet preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="omnivore">Omnivore</SelectItem>
                      <SelectItem value="vegetarian">Vegetarian</SelectItem>
                      <SelectItem value="vegan">Vegan</SelectItem>
                      <SelectItem value="pescatarian">Pescatarian</SelectItem>
                      <SelectItem value="keto">Ketogenic</SelectItem>
                      <SelectItem value="paleo">Paleo</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                      <SelectItem value="low-carb">Low Carb</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activityGoals" className="text-white font-medium">Activity Goals</Label>
                  <Select onValueChange={(value) => handleSelectChange("activityGoals", value)} required>
                    <SelectTrigger className="fitness-input">
                      <SelectValue placeholder="Select activity goals" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase-cardio">Increase Cardio Fitness</SelectItem>
                      <SelectItem value="build-strength">Build Strength</SelectItem>
                      <SelectItem value="improve-flexibility">Improve Flexibility</SelectItem>
                      <SelectItem value="lose-fat">Lose Body Fat</SelectItem>
                      <SelectItem value="gain-muscle">Gain Muscle Mass</SelectItem>
                      <SelectItem value="sports-performance">Improve Sports Performance</SelectItem>
                      <SelectItem value="general-fitness">General Fitness</SelectItem>
                      <SelectItem value="injury-recovery">Injury Recovery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full fitness-button h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-fitness-muted/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-to-r from-fitness-card to-fitness-card px-2 text-fitness-light">
                  or sign up with
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="fitness-social-button"
                onClick={() => handleSocialSignup('google')}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              
              <Button
                variant="outline"
                className="fitness-social-button"
                onClick={() => handleSocialSignup('facebook')}
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-fitness-light text-sm">
                Already have an account?{" "}
                <Button 
                  variant="link" 
                  className="text-fitness-primary hover:text-white p-0 font-semibold"
                  onClick={() => navigate("/login")}
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-fitness-light text-sm">
          <p>© 2024 AI Nutrition Analyzer. Transform your health journey.</p>
        </div>
      </div>
    </div>
  );
}
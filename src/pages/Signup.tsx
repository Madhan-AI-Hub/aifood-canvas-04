import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
            target_weight: parseFloat(formData.targetWeight)
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
          title: "Account Created Successfully! 🎉",
          description: "Let's complete your profile setup to personalize your experience.",
        });
        // Redirect to onboarding instead of login
        navigate("/onboarding");
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
          <h1 className="text-3xl font-bold text-black mb-2">AI Nutrition Analyzer</h1>
          <p className="text-black font-medium">Track. Train. Transform.</p>
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
                  <User className="absolute left-3 top-3 h-4 w-4 text-white z-10" style={{ color: 'white' }} />
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
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white z-10" style={{ color: 'white' }} />
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
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white z-10" style={{ color: 'white' }} />
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
                    className="absolute right-1 top-1 h-8 w-8 p-0 text-white hover:text-gray-300 z-10"
                    style={{ color: 'white' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white z-10" style={{ color: 'white' }} />
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
                    className="absolute right-1 top-1 h-8 w-8 p-0 text-white hover:text-gray-300 z-10"
                    style={{ color: 'white' }}
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
        <div className="text-center mt-8 text-black">
          <p>© 2024 AI Nutrition Analyzer. Transform your health journey.</p>
        </div>
      </div>
    </div>
  );
}
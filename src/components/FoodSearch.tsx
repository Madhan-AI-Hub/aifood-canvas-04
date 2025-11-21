/**
 * Production-grade FoodSearch component for food database search and manual entry
 * Implements autocomplete search, nutrition entry, and portion calculation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Plus, 
  Loader2, 
  Calculator,
  Database,
  PencilLine,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export interface FoodItem {
  id: string;
  name: string;
  calories_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  proteins_per_100g: number;
  is_custom: boolean;
  created_by?: string;
}

export interface NutritionData {
  calories: number;
  carbs: number;
  fats: number;
  proteins: number;
}

interface FoodSearchProps {
  onFoodSelected: (
    foodName: string, 
    portionSize: number, 
    nutrition: NutritionData,
    mealType: string
  ) => Promise<void>;
  selectedMealType: string;
  disabled?: boolean;
}

export default function FoodSearch({ onFoodSelected, selectedMealType, disabled }: FoodSearchProps) {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [portionSize, setPortionSize] = useState<number>(100);
  const [isSearching, setIsSearching] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Manual entry state
  const [manualFood, setManualFood] = useState({
    name: '',
    calories: '',
    carbs: '',
    fats: '',
    proteins: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  // Debounced search function
  const searchFoods = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .or(`name.ilike.%${query}%`)
        .or(`and(is_custom.eq.false),and(is_custom.eq.true,created_by.eq.${user?.id})`)
        .order('is_custom', { ascending: true })
        .order('name', { ascending: true })
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Food search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search foods. Please try again.",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user?.id, toast]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery && !isManualEntry) {
        searchFoods(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isManualEntry, searchFoods]);

  // Calculate nutrition based on portion size
  const calculatedNutrition = useMemo((): NutritionData => {
    if (selectedFood) {
      const multiplier = portionSize / 100;
      return {
        calories: Math.round(selectedFood.calories_per_100g * multiplier),
        carbs: Math.round(selectedFood.carbs_per_100g * multiplier * 10) / 10,
        fats: Math.round(selectedFood.fats_per_100g * multiplier * 10) / 10,
        proteins: Math.round(selectedFood.proteins_per_100g * multiplier * 10) / 10
      };
    } else if (isManualEntry) {
      return {
        calories: parseInt(manualFood.calories) || 0,
        carbs: parseFloat(manualFood.carbs) || 0,
        fats: parseFloat(manualFood.fats) || 0,
        proteins: parseFloat(manualFood.proteins) || 0
      };
    }
    
    return { calories: 0, carbs: 0, fats: 0, proteins: 0 };
  }, [selectedFood, portionSize, isManualEntry, manualFood]);

  // Handle food selection from search results
  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food);
    setSearchQuery(food.name);
    setSearchResults([]);
    setIsManualEntry(false);
  };

  // Handle manual entry toggle
  const toggleManualEntry = () => {
    setIsManualEntry(!isManualEntry);
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setManualFood({
      name: '',
      calories: '',
      carbs: '',
      fats: '',
      proteins: ''
    });
  };

  // Add food to meal log
  const handleAddFood = async () => {
    const foodName = isManualEntry ? manualFood.name : selectedFood?.name;
    
    if (!foodName?.trim()) {
      toast({
        title: "Food Name Required",
        description: "Please enter a food name.",
        variant: "destructive"
      });
      return;
    }

    if (calculatedNutrition.calories === 0) {
      toast({
        title: "Nutrition Data Required",
        description: "Please ensure nutrition information is provided.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedMealType) {
      toast({
        title: "Meal Type Required",
        description: "Please select a meal type.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // If manual entry, save as custom food first
      if (isManualEntry && manualFood.name.trim()) {
        const { error: foodError } = await supabase
          .from('food_items')
          .upsert({
            name: manualFood.name.trim(),
            calories_per_100g: parseInt(manualFood.calories) || 0,
            carbs_per_100g: parseFloat(manualFood.carbs) || 0,
            fats_per_100g: parseFloat(manualFood.fats) || 0,
            proteins_per_100g: parseFloat(manualFood.proteins) || 0,
            is_custom: true,
            created_by: user?.id
          }, {
            onConflict: 'name,created_by'
          });

        if (foodError) {
          console.error('Custom food save error:', foodError);
          // Continue with meal logging even if custom food save fails
        }
      }

      // Add to meal log
      await onFoodSelected(
        foodName,
        isManualEntry ? 100 : portionSize, // Manual entry assumes per 100g
        calculatedNutrition,
        selectedMealType
      );

      // Reset form
      setSelectedFood(null);
      setSearchQuery('');
      setPortionSize(100);
      setManualFood({
        name: '',
        calories: '',
        carbs: '',
        fats: '',
        proteins: ''
      });
      setIsManualEntry(false);

      toast({
        title: "Food Added",
        description: `Added ${foodName} to ${selectedMealType}`,
      });

    } catch (error) {
      console.error('Add food error:', error);
      toast({
        title: "Error Adding Food",
        description: "Failed to add food to your log. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation
  const canSubmit = useMemo(() => {
    if (isManualEntry) {
      return manualFood.name.trim() && 
             manualFood.calories && 
             parseInt(manualFood.calories) > 0;
    } else {
      return selectedFood && portionSize > 0;
    }
  }, [isManualEntry, manualFood, selectedFood, portionSize]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Add Food to {selectedMealType}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleManualEntry}
            className="flex items-center gap-2"
          >
            {isManualEntry ? <Database className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
            {isManualEntry ? 'Search Foods' : 'Manual Entry'}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isManualEntry ? (
          // Food Search Mode
          <>
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="food-search">Search foods</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="food-search"
                  placeholder="e.g., Chicken breast, Apple, Brown rice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={disabled}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                {searchResults.map((food) => (
                  <Button
                    key={food.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => handleFoodSelect(food)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{food.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {food.calories_per_100g} cal/100g
                        </p>
                      </div>
                      {food.is_custom && (
                        <Badge variant="secondary" className="text-xs">Custom</Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Selected Food & Portion */}
            {selectedFood && (
              <>
                <Separator />
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{selectedFood.name}</span>
                    {selectedFood.is_custom && (
                      <Badge variant="secondary" className="text-xs">Custom</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="portion">Portion Size (grams)</Label>
                      <Input
                        id="portion"
                        type="number"
                        min="1"
                        max="2000"
                        value={portionSize}
                        onChange={(e) => setPortionSize(parseInt(e.target.value) || 0)}
                        disabled={disabled}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Nutrition (calculated)</Label>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">{calculatedNutrition.calories}</span> cal</p>
                        <p>C: {calculatedNutrition.carbs}g | F: {calculatedNutrition.fats}g | P: {calculatedNutrition.proteins}g</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          // Manual Entry Mode
          <>
            <Alert>
              <PencilLine className="h-4 w-4" />
              <AlertDescription>
                Enter food details manually. This will be saved as a custom food for future use.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manual-name">Food Name *</Label>
                <Input
                  id="manual-name"
                  placeholder="e.g., Homemade pasta salad"
                  value={manualFood.name}
                  onChange={(e) => setManualFood(prev => ({ ...prev, name: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-calories">Calories (per 100g) *</Label>
                <Input
                  id="manual-calories"
                  type="number"
                  min="0"
                  max="9999"
                  placeholder="e.g., 250"
                  value={manualFood.calories}
                  onChange={(e) => setManualFood(prev => ({ ...prev, calories: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-carbs">Carbs (g per 100g)</Label>
                <Input
                  id="manual-carbs"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 30.5"
                  value={manualFood.carbs}
                  onChange={(e) => setManualFood(prev => ({ ...prev, carbs: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-fats">Fats (g per 100g)</Label>
                <Input
                  id="manual-fats"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 15.2"
                  value={manualFood.fats}
                  onChange={(e) => setManualFood(prev => ({ ...prev, fats: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-proteins">Proteins (g per 100g)</Label>
                <Input
                  id="manual-proteins"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 25.8"
                  value={manualFood.proteins}
                  onChange={(e) => setManualFood(prev => ({ ...prev, proteins: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </div>

            {calculatedNutrition.calories > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Nutrition Summary (per 100g)</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-lg">{calculatedNutrition.calories}</p>
                    <p className="text-muted-foreground">Calories</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{calculatedNutrition.carbs}</p>
                    <p className="text-muted-foreground">Carbs (g)</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{calculatedNutrition.fats}</p>
                    <p className="text-muted-foreground">Fats (g)</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{calculatedNutrition.proteins}</p>
                    <p className="text-muted-foreground">Proteins (g)</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <Separator />

        {/* Add Button */}
        <Button
          onClick={handleAddFood}
          disabled={!canSubmit || disabled || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding Food...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add to {selectedMealType}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
/**
 * Production-grade MealCard component for displaying individual meal entries
 * Handles editing, deletion, and real-time updates with proper error handling
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Trash2, 
  Edit2, 
  Clock, 
  Image as ImageIcon,
  Loader2,
  Save,
  X
} from "lucide-react";

export interface MealLog {
  id: string;
  food_name: string;
  portion_size: number;
  calories: number;
  carbs: number;
  fats: number;
  proteins: number;
  image_url?: string;
  logged_at: string;
  created_at: string;
}

interface MealCardProps {
  meal: MealLog;
  onEdit: (id: string, updates: Partial<MealLog>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
}

interface EditData {
  food_name: string;
  portion_size: string;
  calories: string;
  carbs: string;
  fats: string;
  proteins: string;
}

export default function MealCard({ meal, onEdit, onDelete, disabled }: MealCardProps) {
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    food_name: meal.food_name,
    portion_size: meal.portion_size.toString(),
    calories: meal.calories.toString(),
    carbs: meal.carbs.toString(),
    fats: meal.fats.toString(),
    proteins: meal.proteins.toString()
  });

  const { toast } = useToast();

  // Format time for display
  const formatTime = useCallback((dateString: string): string => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown time';
    }
  }, []);

  // Reset edit form
  const resetEditForm = useCallback(() => {
    setEditData({
      food_name: meal.food_name,
      portion_size: meal.portion_size.toString(),
      calories: meal.calories.toString(),
      carbs: meal.carbs.toString(),
      fats: meal.fats.toString(),
      proteins: meal.proteins.toString()
    });
  }, [meal]);

  // Handle edit submission
  const handleEditSubmit = useCallback(async () => {
    // Validate required fields
    if (!editData.food_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Food name is required.",
        variant: "destructive"
      });
      return;
    }

    const portion = parseFloat(editData.portion_size);
    if (isNaN(portion) || portion <= 0) {
      toast({
        title: "Validation Error",
        description: "Portion size must be a positive number.",
        variant: "destructive"
      });
      return;
    }

    const calories = parseFloat(editData.calories);
    if (isNaN(calories) || calories < 0) {
      toast({
        title: "Validation Error",
        description: "Calories must be a non-negative number.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);

    try {
      const updates: Partial<MealLog> = {
        food_name: editData.food_name.trim(),
        portion_size: portion,
        calories: calories,
        carbs: parseFloat(editData.carbs) || 0,
        fats: parseFloat(editData.fats) || 0,
        proteins: parseFloat(editData.proteins) || 0
      };

      await onEdit(meal.id, updates);
      
      setIsEditing(false);
      toast({
        title: "Meal Updated",
        description: "Your meal entry has been updated successfully.",
      });

    } catch (error) {
      console.error('Edit meal error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update meal entry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  }, [editData, meal.id, onEdit, toast]);

  // Handle deletion
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);

    try {
      await onDelete(meal.id);
      
      toast({
        title: "Meal Deleted",
        description: "Meal entry has been removed from your log.",
      });

    } catch (error) {
      console.error('Delete meal error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete meal entry. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [meal.id, onDelete, toast]);

  // Handle edit dialog close
  const handleEditDialogClose = useCallback(() => {
    if (!isUpdating) {
      resetEditForm();
      setIsEditing(false);
    }
  }, [isUpdating, resetEditForm]);

  return (
    <Card className="relative">
      {/* Meal Image */}
      {meal.image_url && (
        <div className="relative h-32 overflow-hidden rounded-t-lg">
          <img
            src={meal.image_url}
            alt={meal.food_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/50 text-white border-0">
              <ImageIcon className="h-3 w-3 mr-1" />
              Photo
            </Badge>
          </div>
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Food Name and Time */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm line-clamp-2">{meal.food_name}</h4>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(meal.logged_at)}</span>
            </div>
          </div>
        </div>

        {/* Nutrition Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Portion:</span>
            <span className="text-sm font-medium">{meal.portion_size}g</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calories:</span>
              <span className="font-medium">{Math.round(meal.calories)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carbs:</span>
              <span className="font-medium">{Math.round(meal.carbs * 10) / 10}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fats:</span>
              <span className="font-medium">{Math.round(meal.fats * 10) / 10}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proteins:</span>
              <span className="font-medium">{Math.round(meal.proteins * 10) / 10}g</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {/* Edit Dialog */}
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={disabled}
                onClick={() => {
                  resetEditForm();
                  setIsEditing(true);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Meal Entry</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Food Name</Label>
                  <Input
                    id="edit-name"
                    value={editData.food_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, food_name: e.target.value }))}
                    disabled={isUpdating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-portion">Portion (g)</Label>
                    <Input
                      id="edit-portion"
                      type="number"
                      min="0"
                      step="0.1"
                      value={editData.portion_size}
                      onChange={(e) => setEditData(prev => ({ ...prev, portion_size: e.target.value }))}
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-calories">Calories</Label>
                    <Input
                      id="edit-calories"
                      type="number"
                      min="0"
                      value={editData.calories}
                      onChange={(e) => setEditData(prev => ({ ...prev, calories: e.target.value }))}
                      disabled={isUpdating}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-carbs">Carbs (g)</Label>
                    <Input
                      id="edit-carbs"
                      type="number"
                      min="0"
                      step="0.1"
                      value={editData.carbs}
                      onChange={(e) => setEditData(prev => ({ ...prev, carbs: e.target.value }))}
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-fats">Fats (g)</Label>
                    <Input
                      id="edit-fats"
                      type="number"
                      min="0"
                      step="0.1"
                      value={editData.fats}
                      onChange={(e) => setEditData(prev => ({ ...prev, fats: e.target.value }))}
                      disabled={isUpdating}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-proteins">Proteins (g)</Label>
                    <Input
                      id="edit-proteins"
                      type="number"
                      min="0"
                      step="0.1"
                      value={editData.proteins}
                      onChange={(e) => setEditData(prev => ({ ...prev, proteins: e.target.value }))}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleEditDialogClose}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSubmit}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={disabled || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Meal Entry</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{meal.food_name}"? This action cannot be undone 
                  and will update your daily nutrition totals.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { ExerciseService, Exercise } from '../services/exercise.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NutritionixSearchComponent } from '../nutritionix-search/nutritionix-search.component';

function calculateBMR(gender: string, weight: number, height_ft: number, height_in: number, age: number): number {
  const height_cm = ((height_ft * 12) + height_in) * 2.54;
  const weight_kg = weight * 0.453592;
  if (gender === 'male') {
    return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5);
  } else if (gender === 'female') {
    return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161);
  } else {
    return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age); 
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NutritionixSearchComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  exercises: Exercise[] = [];
  username = '';
  logs: any[] = [];
  selectedExercise = '';
  duration = 30;
  exerciseLogs: any[] = [];
  caloriesBurned = null;
  foodLogs: any[] = [];
  bmr: any;
  summaryType: 'daily' | 'all-time' = 'daily';
  showSummaryModal = false;
  nutritionTotals = { protein: 0, carbs: 0, fat: 0 };
  totalWorkoutMinutes = 0;
  exerciseBreakdown: { type: string, duration: number, calories: number }[] = [];
  summary: any = {
    timeframe: '',
    date: '',
    calories_consumed: 0,
    calories_burned: 0,
    resting_burn: 0,
    active_burn: 0,
    net_calories: 0,
    status: ''
  };

  errorMessage: string | null = null;
  logTab: 'exercise' | 'food' = 'exercise';
  formTab: 'exercise' | 'food' = 'exercise';

  

  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    
    if (!user?.username) {
      console.error('User not logged in');
      return;
    }

    this.username = user.username;

    this.http.get<any>(`/api/profile`).subscribe(profile => {
      const { gender, weight, height_ft, height_in, age } = profile;
      this.bmr = calculateBMR(gender, weight, height_ft, height_in, age);
    });
    
    this.http.get<any[]>('/api/exercises').subscribe(data => {
      this.exercises = data;
    });

    this.loadSummary();
    this.loadExerciseLogs();
    this.loadFoodLogs();
  }

  logExercise() {
    if (!this.selectedExercise || !this.duration || !this.caloriesBurned) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.errorMessage = null;
    
    const payload = {
      exercise_id: this.selectedExercise,
      duration_min: this.duration,
      calories_burned: this.caloriesBurned,
      username: this.username
    };
    
    this.http.post('/api/log-exercise', payload).subscribe({
      next: () => this.loadExerciseLogs(),
      error: err => console.error('Error logging exercise:', err)
    });  
    
    this.loadSummary();
  }

  loadExerciseLogs() {
    this.http.get<any[]>(`/api/user-exercises/${this.username}`).subscribe({
      next: (data: any) => { this.logs = data; },
      error: err => { console.error('Error fetching logs', err); }
    });
  }

  deleteLog(log_id: number){
    this.http.delete(`/api/exercise-log/${log_id}`, { withCredentials: true }).subscribe({
      next: () => {
        this.logs = this.logs.filter(log => log.exercise_log_id !== log_id);
      },
      error: err => {
        console.error('Failed to delete log:', err);
      }
    });
    this.loadSummary();
  }

  deleteFoodLog(meal_id: number) {
    this.http.delete(`/api/food-log/${meal_id}`, { withCredentials: true }).subscribe({
      next: () => {
        this.foodLogs = this.foodLogs.filter(food => food.meal_id !== meal_id);
        this.loadSummary();
      },
      error: err => {
        console.error('Failed to delete food log:', err);
      }
    });
  }
  
  loadFoodLogs() {
    this.http.get<any[]>(`/api/user-food/${this.username}`).subscribe({
      next: (data) => this.foodLogs = data,
      error: (err) => console.error('Error loading food logs:', err)
    });
  }

  loadSummary() {
    const endpoint = this.summaryType === 'daily'
      ? `/api/summary/${this.username}/today`
      : `/api/summary/${this.username}/all-time`;

    this.http.get(endpoint, { withCredentials: true }).subscribe({
      next: (data) => this.summary = data,
      error: (err) => console.error('Failed to load summary:', err)
    });
  }

  setSummaryType(type: 'daily' | 'all-time') {
    this.summaryType = type;
    this.loadSummary();
  }

  openSummaryModal() {
    this.calculateNutritionTotals();
    this.calculateExerciseBreakdown();
    this.showSummaryModal = true;
  }

  closeSummaryModal() {
    this.showSummaryModal = false;
  }

  calculateNutritionTotals() {
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
    const estStartOfDay = new Date(today);
    estStartOfDay.setHours(0, 0, 0, 0);
  
    const estEndOfDay = new Date(today);
    estEndOfDay.setHours(23, 59, 59, 999);
  
    this.nutritionTotals = this.foodLogs.reduce((acc, food) => {
      const foodDate = new Date(food.date);
      const foodEST = new Date(foodDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
      if (foodEST >= estStartOfDay && foodEST <= estEndOfDay) {
        acc.protein += Number(food.protein) || 0;
        acc.carbs += Number(food.carbs) || 0;
        acc.fat += Number(food.fat) || 0;
      }
      return acc;
    }, { protein: 0, carbs: 0, fat: 0 });
  
    this.nutritionTotals.protein = Math.round(this.nutritionTotals.protein * 10) / 10;
    this.nutritionTotals.carbs = Math.round(this.nutritionTotals.carbs * 10) / 10;
    this.nutritionTotals.fat = Math.round(this.nutritionTotals.fat * 10) / 10;
  }
  
  calculateExerciseBreakdown() {
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
    const estStartOfDay = new Date(today);
    estStartOfDay.setHours(0, 0, 0, 0);
  
    const estEndOfDay = new Date(today);
    estEndOfDay.setHours(23, 59, 59, 999);
  
    const breakdownMap: { [key: string]: { duration: number, calories: number } } = {};
    this.totalWorkoutMinutes = 0;
  
    for (const log of this.logs) {
      const logDate = new Date(log.exercise_date);
      const logEST = new Date(logDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
      if (logEST >= estStartOfDay && logEST <= estEndOfDay) {
        if (!breakdownMap[log.exercise_description]) {
          breakdownMap[log.exercise_description] = { duration: 0, calories: 0 };
        }
        breakdownMap[log.exercise_description].duration += log.duration_min || 0;
        breakdownMap[log.exercise_description].calories += log.calories_burned || 0;
        this.totalWorkoutMinutes += log.duration_min || 0;
      }
    }
  
    this.exerciseBreakdown = Object.entries(breakdownMap).map(([type, data]) => ({
      type, ...data
    }));
  }
  
  profile() {
    this.router.navigate(['/profile']);
  }

}
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
    return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age); // Neutral
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
  summary: any;
  bmr: any;
  summaryType: 'daily' | 'all-time' = 'daily';

  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.username = user?.username;

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
      alert('Please fill in all required fields.');
      return;
    }
    
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
        alert('Could not delete log. Please try again.');
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
        alert('Could not delete food log. Please try again.');
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

    this.http.get(endpoint).subscribe({
      next: (data) => this.summary = data,
      error: (err) => console.error('Failed to load summary:', err)
    });
  }

  setSummaryType(type: 'daily' | 'all-time') {
    this.summaryType = type;
    this.loadSummary();
  }
  

  profile() {
    this.router.navigate(['/profile']);
  }

}
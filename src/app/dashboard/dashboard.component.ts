import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { ExerciseService, Exercise } from '../services/exercise.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NutritionixSearchComponent } from '../nutritionix-search/nutritionix-search.component';
; 

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

  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.username = user?.username;

    this.http.get<any[]>('/api/exercises').subscribe(data => {
      this.exercises = data;
    });

    this.loadExerciseLogs();
  }

  logExercise() {
    if (!this.selectedExercise || !this.duration) {
      alert('Please select an exercise and enter a duration.');
      return;
    }

    const payload = {
      exercise_id: this.selectedExercise,
      duration_min: this.duration,
      username: this.username
    };

    this.http.post('/api/log-exercise', payload).subscribe({
      next: () => this.loadExerciseLogs(),
      error: err => console.error('Error logging exercise:', err)
    });
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
  }

  profile() {
    this.router.navigate(['/profile']);
  }
}
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { ExerciseService, Exercise } from '../services/exercise.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  exercises: Exercise[] = [];
  username = '';
  logs: any[] = [];
  selectedExercise = '';
  duration = 30;

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
    if (!this.selectedExercise || !this.duration) return;

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
      next: data => this.logs = data,
      error: err => console.error('Error loading logs:', err)
    });
  }

  profile() {
    this.router.navigate(['/profile']);
  }
}
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { ExerciseService, Exercise } from '../services/exercise.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  selectedExercise: number | null = null;

  constructor(
    private exerciseService: ExerciseService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Fetch exercises
    this.exerciseService.getExercises().subscribe({
      next: (data) => {
        this.exercises = data;
      },
      error: (err) => console.error('Failed to load exercises:', err),
    });

    // Get logged-in user
    const user = this.authService.getUser();
    if (user) {
      this.username = user.username;
    } else {
      // Optionally, redirect to login if user is not logged in
      this.router.navigate(['/login']);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  profile() {
    this.router.navigate(['/profile']);
  }
}
// nutritionix-search.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth.service';
import { OnInit } from '@angular/core';
import axios from 'axios';



@Component({
  selector: 'app-nutritionix-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nutritionix-search.component.html',
  styleUrls: ['./nutritionix-search.component.css']
})


export class NutritionixSearchComponent implements OnInit {
  constructor(private authService: AuthService) {}
  foodName = '';
  result: any = null;
  loading = false;
  error: string | null = null;

  mealTypes: string[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
  selectedMeal = '';
  servings: number = 1;


  private appId = 'ddf68a64';
  private appKey = '3426137af00a32d5719868a2f7f8966b';

  username: string = '';

  @Output() foodLogged = new EventEmitter<void>();

  ngOnInit() {
    axios.get('/api/current-user', { withCredentials: true })
      .then(res => {
        this.username = res.data.username;
      })
      .catch(err => {
        console.error('Failed to fetch user:', err);
      });
}


logFood() {
  const user = this.authService.getUser();
  this.username = user?.username;
  console.log('Logging food...');
  console.log('Result:', this.result);
  console.log('Selected Meal:', this.selectedMeal);
  console.log('Servings:', this.servings);

  if (!this.result || !this.selectedMeal || !this.servings || !this.username) {
    alert("Missing required information.");
    return;
  }


  const foodData = {
    username: this.username,
    meal_type: this.selectedMeal.toLowerCase(),
    quantity: this.servings,
    protein: parseFloat((parseFloat(this.result.nf_protein) * this.servings).toFixed(2)),
    fat: parseFloat((parseFloat(this.result.nf_total_fat) * this.servings).toFixed(2)),
    carbs: parseFloat((parseFloat(this.result.nf_total_carbohydrate) * this.servings).toFixed(2)),
    calories: Math.round(parseFloat(this.result.nf_calories) * this.servings),
    food_name: this.result.food_name
  };

  axios.post('/api/log-food', foodData, { withCredentials: true })
    .then(() => {
      alert('Food logged successfully!');
      this.foodLogged.emit();
    })
    .catch(error => {
      console.error('Error logging food:', error);
      alert('Failed to log food.');
    });
}


  async searchFood() {
    this.loading = true;
    this.error = null;
    this.result = null;

    const url = `https://trackapi.nutritionix.com/v2/natural/nutrients`;
    const headers = {
      'x-app-id': this.appId,
      'x-app-key': this.appKey,
      'Content-Type': 'application/json'
    };
    const body = {
      query: this.foodName,
      timezone: 'US/Eastern'
    };

    try {
      const response = await axios.post(url, body, { headers });
      const foods = response.data.foods;
      if (foods && foods.length > 0) {
        this.result = foods[0];
      } else {
        this.error = 'No results found.';
      }
    } catch (err: any) {
      this.error = err.response?.data?.message || err.message;
    } finally {
      this.loading = false;
    }
  }
}

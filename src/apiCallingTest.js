import axios from 'axios';
import qs from 'qs';

const clientId = '8669fc1585b84710936cc8f3e6d28b34';
const clientSecret = 'f87c096e5d034b3b983deb3e97fd277f';

async function getAccessToken() {
  const tokenUrl = 'https://oauth.fatsecret.com/connect/token';

  const data = qs.stringify({
    grant_type: 'client_credentials',
    scope: 'basic',
  });

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
  };

  try {
    const response = await axios.post(tokenUrl, data, { headers });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
  }
}

async function searchFood(foodName) {
    const token = await getAccessToken();
    const url = `https://platform.fatsecret.com/rest/server.api`;
  
    const params = {
      method: 'foods.search',
      format: 'json',
      search_expression: foodName,
    };
  
    const headers = {
      Authorization: `Bearer ${token}`,
    };
  
    try {
      const response = await axios.get(url, { params, headers });
      console.log(response.data);
    } catch (err) {
      console.error('API call error:', err.response?.data || err.message);
    }
  }
  

  searchFood('chicken');

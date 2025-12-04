# Movex Transfer Backend

Backend API for the Movex Transfer reservation system, built with Node.js, Express, and PostgreSQL.

## Features

- **POST /api/reservations** - Create new reservation
  - Validates input data
  - Checks for overlapping reservations (travel time + 1.5h buffer)
  - Calculates pickup fee (Ostrava Centrum = free, else km × 16 Kč)
  - Sends confirmation email to customer (in Czech) via Resend
  - Sends internal notification to owner email

- **GET /api/reservations/:id** - Get reservation by ID
- **GET /api/health** - Health check endpoint

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL | Primary key |
| type | VARCHAR(50) | Service type (katowice, krakow, vienna, prague, brno, private-driver) |
| date | DATE | Pickup date |
| time | TIME | Pickup time |
| pickup_address | VARCHAR(255) | Customer's pickup location |
| dropoff_airport | VARCHAR(100) | Destination airport/location |
| passengers_count | INTEGER | Number of passengers (1-3) |
| flight_number | VARCHAR(20) | Optional flight number |
| luggage_count | INTEGER | Number of luggage pieces |
| email | VARCHAR(255) | Customer's email |
| price | INTEGER | Total price in CZK |
| status | VARCHAR(20) | Reservation status (default: pending) |
| created_at | TIMESTAMP | Creation timestamp |

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL database and run the schema:
   ```bash
   psql -d your_database -f schema.sql
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `RESEND_API_KEY` - Resend API key for sending emails
   - `OWNER_EMAIL` - Email address for internal notifications
   - `PORT` - Server port (default: 3000)
   - `FRONTEND_URL` - Allowed origins for CORS

5. Start the server:
   ```bash
   npm start
   ```

## Deployment to Railway

1. Create a new project on Railway
2. Add a PostgreSQL database
3. Connect your GitHub repository
4. Set environment variables in Railway dashboard
5. Deploy!

Railway will automatically:
- Detect the Node.js project
- Install dependencies
- Start the server using `npm start`

### CORS Configuration

For Railway deployment, set `FRONTEND_URL` to your deployed frontend domain:
```
FRONTEND_URL=https://your-frontend.railway.app
```

Multiple origins can be comma-separated:
```
FRONTEND_URL=https://your-frontend.railway.app,https://custom-domain.com
```

## API Usage

### Create Reservation

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "katowice",
    "date": "2024-12-25",
    "time": "10:00",
    "pickup_address": "Ostrava Centrum",
    "dropoff_airport": "Letiště Katowice",
    "passengers_count": 2,
    "flight_number": "OK123",
    "luggage_count": 2,
    "email": "customer@example.com",
    "price": 1800
  }'
```

### Response

```json
{
  "success": true,
  "message": "Rezervace byla úspěšně vytvořena",
  "data": {
    "id": 1,
    "type": "katowice",
    "date": "2024-12-25",
    "time": "10:00",
    "pickup_address": "Ostrava Centrum",
    "dropoff_airport": "Letiště Katowice",
    "passengers_count": 2,
    "flight_number": "OK123",
    "luggage_count": 2,
    "email": "customer@example.com",
    "price": 1800,
    "status": "pending",
    "created_at": "2024-12-04T15:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Termín je již obsazený. Vyberte prosím jiný čas.",
  "code": "OVERLAP"
}
```

-- Create reservations table for Movex Transfer booking system
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    pickup_address VARCHAR(255) NOT NULL,
    dropoff_airport VARCHAR(100) NOT NULL,
    passengers_count INTEGER NOT NULL CHECK (passengers_count >= 1 AND passengers_count <= 3),
    flight_number VARCHAR(20),
    luggage_count INTEGER DEFAULT 0,
    email VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on date and time for efficient overlap checking
CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(date, time);

-- Create index on email for customer lookups
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { sendCustomerConfirmation, sendOwnerNotification } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Travel times in minutes for each destination (approximate)
const TRAVEL_TIMES = {
    'katowice': 60,
    'krakow': 120,
    'vienna': 180,
    'prague': 240,
    'brno': 120,
    'private-driver': 120 // default for private driver
};

// CORS configuration for Railway deployment
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            console.warn('CORS blocked origin:', origin);
            callback(null, true); // Allow all in production for flexibility
        }
    },
    credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Check if pickup address is in Ostrava Centrum (no pickup fee)
 */
function isOstravaCentrum(address) {
    if (!address) return false;
    const normalizedAddress = address.toLowerCase().trim();
    return normalizedAddress.includes('ostrava centrum') || 
           normalizedAddress === 'ostrava centrum';
}

/**
 * Calculate pickup fee based on distance
 * - Ostrava Centrum: no fee
 * - Other locations: km × 16 Kč
 */
function calculatePickupFee(pickupAddress, estimatedKm) {
    if (isOstravaCentrum(pickupAddress)) {
        return 0;
    }
    // If km is provided, use it; otherwise, return 0 (will be added later)
    return estimatedKm ? Math.round(estimatedKm * 16) : 0;
}

/**
 * Check for overlapping reservations
 * Uses travel_time + 1.5h buffer
 */
async function hasOverlappingReservation(date, time, type) {
    const travelTime = TRAVEL_TIMES[type] || 120;
    const bufferMinutes = 90; // 1.5 hours
    const totalBlockedMinutes = travelTime + bufferMinutes;

    // Convert time string to minutes for easier calculation
    const [hours, minutes] = time.split(':').map(Number);
    const requestStartMinutes = hours * 60 + minutes;
    const requestEndMinutes = requestStartMinutes + totalBlockedMinutes;

    // Query for reservations on the same date
    const query = `
        SELECT id, time, type FROM reservations 
        WHERE date = $1 AND status != 'cancelled'
    `;
    
    const result = await pool.query(query, [date]);
    
    for (const reservation of result.rows) {
        const [resHours, resMinutes] = reservation.time.split(':').map(Number);
        const resStartMinutes = resHours * 60 + resMinutes;
        const resTravelTime = TRAVEL_TIMES[reservation.type] || 120;
        const resEndMinutes = resStartMinutes + resTravelTime + bufferMinutes;

        // Check for overlap
        if (requestStartMinutes < resEndMinutes && requestEndMinutes > resStartMinutes) {
            return true;
        }
    }

    return false;
}

/**
 * Validate reservation data
 */
function validateReservation(data) {
    const errors = [];

    if (!data.type) errors.push('Typ služby je povinný');
    if (!data.date) errors.push('Datum je povinné');
    if (!data.time) errors.push('Čas je povinný');
    if (!data.pickup_address) errors.push('Místo vyzvednutí je povinné');
    if (!data.dropoff_airport) errors.push('Cílová destinace je povinná');
    if (!data.passengers_count || data.passengers_count < 1 || data.passengers_count > 3) {
        errors.push('Počet cestujících musí být 1-3');
    }
    if (!data.email || !data.email.includes('@')) {
        errors.push('Platný email je povinný');
    }
    if (data.price === undefined || data.price < 0) {
        errors.push('Cena je povinná');
    }

    // Validate date is in the future
    const reservationDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
        errors.push('Datum nemůže být v minulosti');
    }

    return errors;
}

/**
 * POST /api/reservations - Create a new reservation
 */
app.post('/api/reservations', async (req, res) => {
    try {
        const {
            type,
            date,
            time,
            pickup_address,
            dropoff_airport,
            passengers_count,
            flight_number,
            luggage_count,
            email,
            price,
            estimated_km
        } = req.body;

        // Validate input
        const validationErrors = validateReservation(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }

        // Check for overlapping reservations
        const hasOverlap = await hasOverlappingReservation(date, time, type);
        if (hasOverlap) {
            return res.status(409).json({
                success: false,
                error: 'Termín je již obsazený. Vyberte prosím jiný čas.',
                code: 'OVERLAP'
            });
        }

        // Calculate final price with pickup fee if applicable
        const pickupFee = calculatePickupFee(pickup_address, estimated_km);
        const finalPrice = price + pickupFee;

        // Insert reservation into database
        const insertQuery = `
            INSERT INTO reservations (
                type, date, time, pickup_address, dropoff_airport,
                passengers_count, flight_number, luggage_count, email, price, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            type,
            date,
            time,
            pickup_address,
            dropoff_airport,
            passengers_count,
            flight_number || null,
            luggage_count || 0,
            email,
            finalPrice,
            'pending'
        ];

        const result = await pool.query(insertQuery, values);
        const reservation = result.rows[0];

        // Send emails (don't fail the request if emails fail)
        try {
            await Promise.all([
                sendCustomerConfirmation(reservation),
                sendOwnerNotification(reservation)
            ]);
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            // Continue - reservation was still created successfully
        }

        res.status(201).json({
            success: true,
            message: 'Rezervace byla úspěšně vytvořena',
            data: {
                id: reservation.id,
                type: reservation.type,
                date: reservation.date,
                time: reservation.time,
                pickup_address: reservation.pickup_address,
                dropoff_airport: reservation.dropoff_airport,
                passengers_count: reservation.passengers_count,
                flight_number: reservation.flight_number,
                luggage_count: reservation.luggage_count,
                email: reservation.email,
                price: reservation.price,
                status: reservation.status,
                created_at: reservation.created_at
            }
        });

    } catch (error) {
        console.error('Reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Při vytváření rezervace došlo k chybě. Zkuste to prosím znovu.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/reservations/:id - Get a specific reservation (for confirmation pages)
 */
app.get('/api/reservations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Rezervace nebyla nalezena'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get reservation error:', error);
        res.status(500).json({
            success: false,
            error: 'Chyba při načítání rezervace'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});

module.exports = app;

// Movex Transfer - Button Interactivity and Booking System

document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const CONFIG = {
        pricePerKm: 25,
        minPrivateDriverPrice: 800,
        nightSurchargePercent: 0.30,
        nightStartHour: 22,
        nightEndHour: 6,
        depositPercent: 0.50,
        maxPassengers: 3,
        airportBufferMinutes: 90, // 1.5 hours buffer for airport trips
        freeWaitingMinutes: 30,
        waitingPricePerHour: 500,
        // TODO: Replace with actual WhatsApp number before production deployment
        whatsappNumber: '4200000000000',
        // TODO: Replace with actual API endpoint before production deployment
        apiEndpoint: '/api/bookings'
    };

    // Service base prices (in CZK)
    const SERVICE_PRICES = {
        'katowice': 1800,
        'krakow': 2400,
        'vienna': 5500,
        'prague': 5000,
        'brno': 3000,
        'private-driver': 800
    };

    // Service names for display
    const SERVICE_NAMES = {
        'katowice': 'Letiště Katowice',
        'krakow': 'Letiště Krakov',
        'vienna': 'Letiště Vídeň',
        'prague': 'Letiště Praha',
        'brno': 'Brno',
        'private-driver': 'Privátní Řidič'
    };

    // Service routes for airport transfers
    const SERVICE_ROUTES = {
        'katowice': 'Ostrava → Letiště Katowice',
        'krakow': 'Ostrava → Letiště Krakov',
        'vienna': 'Ostrava → Letiště Vídeň',
        'prague': 'Ostrava → Letiště Praha',
        'brno': 'Ostrava → Brno'
    };

    // Simulated booked slots (in production, this would come from backend)
    const bookedSlots = [
        // Example: { date: '2024-12-25', time: '10:00', duration: 180 }
    ];

    // DOM Elements
    const modal = document.getElementById('bookingModal');
    const successModal = document.getElementById('successModal');
    const modalClose = document.getElementById('modalClose');
    const bookingForm = document.getElementById('bookingForm');
    const airportFields = document.getElementById('airportFields');
    const privateDriverFields = document.getElementById('privateDriverFields');
    const formError = document.getElementById('formError');

    // Current booking state
    let currentService = null;
    let currentServiceType = null;

    // Initialize booking buttons
    function initBookingButtons() {
        const bookButtons = document.querySelectorAll('.btn-book');
        bookButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const service = this.dataset.service;
                const card = this.closest('.pricing-card');
                const serviceType = card.dataset.type;
                openBookingModal(service, serviceType);
            });
        });
    }

    // Open booking modal
    function openBookingModal(service, serviceType) {
        currentService = service;
        currentServiceType = serviceType;

        // Update modal title
        document.getElementById('modalTitle').textContent = 'Rezervace: ' + SERVICE_NAMES[service];
        document.getElementById('serviceType').value = service;
        document.getElementById('basePrice').value = SERVICE_PRICES[service];

        // Get DOM elements for conditional display
        const modalRoute = document.getElementById('modalRoute');
        const dropoffLocationGroup = document.getElementById('dropoffLocationGroup');
        const dropoffLocationInput = document.getElementById('dropoffLocation');

        // Reset form first
        bookingForm.reset();

        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('pickupDate').value = tomorrow.toISOString().split('T')[0];
        document.getElementById('pickupDate').min = tomorrow.toISOString().split('T')[0];

        // Restore hidden field values after reset
        document.getElementById('serviceType').value = service;
        document.getElementById('basePrice').value = SERVICE_PRICES[service];

        // Show/hide conditional fields based on service type
        if (serviceType === 'airport') {
            // For airport transfers: show route, hide destination field
            airportFields.style.display = 'flex';
            privateDriverFields.style.display = 'none';
            
            // Show the route in modal header
            modalRoute.textContent = SERVICE_ROUTES[service];
            modalRoute.style.display = 'block';
            
            // Hide destination field - it's fixed for airport services
            dropoffLocationGroup.style.display = 'none';
            dropoffLocationInput.removeAttribute('required');
            dropoffLocationInput.value = SERVICE_NAMES[service];
        } else {
            // For private driver: hide route, show destination field
            airportFields.style.display = 'none';
            privateDriverFields.style.display = 'flex';
            
            // Hide the route in modal header
            modalRoute.style.display = 'none';
            
            // Show destination field - needed for private driver
            dropoffLocationGroup.style.display = 'flex';
            dropoffLocationInput.setAttribute('required', 'required');
            dropoffLocationInput.value = '';
        }
        
        hideError();
        updatePriceDisplay();

        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        successModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Close modal handlers
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Check if time is during night hours (22:00 - 06:00)
    function isNightTime(timeStr) {
        if (!timeStr) return false;
        const hour = parseInt(timeStr.split(':')[0], 10);
        return hour >= CONFIG.nightStartHour || hour < CONFIG.nightEndHour;
    }

    // Check if pickup is in Ostrava (simple check)
    function isOstravaPickup(location) {
        if (!location) return true;
        const lowerLocation = location.toLowerCase();
        return lowerLocation.includes('ostrava');
    }

    // Calculate price
    function calculatePrice() {
        const basePrice = parseInt(document.getElementById('basePrice').value, 10) || 0;
        const pickupLocation = document.getElementById('pickupLocation').value;
        const pickupTime = document.getElementById('pickupTime').value;
        const serviceType = currentServiceType;

        let price = basePrice;
        let extraKmPrice = 0;
        let nightSurcharge = 0;

        // For private driver, calculate based on km
        if (serviceType === 'private') {
            const estimatedKm = parseInt(document.getElementById('estimatedKm').value, 10) || 0;
            const roundTrip = document.getElementById('roundTrip').checked;

            price = Math.max(estimatedKm * CONFIG.pricePerKm, CONFIG.minPrivateDriverPrice);

            if (roundTrip) {
                price = price * 2;
            }
        } else {
            // Airport transfers - check if pickup is not from Ostrava
            if (!isOstravaPickup(pickupLocation) && pickupLocation.trim() !== '') {
                // Assuming extra distance - this would need real distance calculation in production
                // For simplicity, we add a flat extra km charge indicator
                extraKmPrice = 0; // Would be calculated with real distance API
            }
        }

        // Night surcharge
        if (isNightTime(pickupTime)) {
            nightSurcharge = Math.round(price * CONFIG.nightSurchargePercent);
        }

        const totalPrice = price + extraKmPrice + nightSurcharge;
        const depositPrice = Math.round(totalPrice * CONFIG.depositPercent);

        return {
            basePrice: price,
            extraKmPrice: extraKmPrice,
            nightSurcharge: nightSurcharge,
            totalPrice: totalPrice,
            depositPrice: depositPrice
        };
    }

    // Update price display
    function updatePriceDisplay() {
        const prices = calculatePrice();

        document.getElementById('basePriceDisplay').textContent = prices.basePrice + ' Kč';
        document.getElementById('totalPrice').textContent = prices.totalPrice + ' Kč';
        document.getElementById('depositPrice').textContent = prices.depositPrice + ' Kč';

        // Show/hide extra km row
        const extraKmRow = document.getElementById('extraKmRow');
        if (prices.extraKmPrice > 0) {
            extraKmRow.style.display = 'flex';
            document.getElementById('extraKmPrice').textContent = prices.extraKmPrice + ' Kč';
        } else {
            extraKmRow.style.display = 'none';
        }

        // Show/hide night surcharge row
        const nightSurchargeRow = document.getElementById('nightSurchargeRow');
        if (prices.nightSurcharge > 0) {
            nightSurchargeRow.style.display = 'flex';
            document.getElementById('nightSurchargePrice').textContent = prices.nightSurcharge + ' Kč';
        } else {
            nightSurchargeRow.style.display = 'none';
        }
    }

    // Check for double booking
    function isSlotBooked(date, time, durationMinutes) {
        const bookingStart = new Date(date + 'T' + time);
        const bookingEnd = new Date(bookingStart.getTime() + durationMinutes * 60000);

        // Add buffer for airport trips
        if (currentServiceType === 'airport') {
            bookingEnd.setTime(bookingEnd.getTime() + CONFIG.airportBufferMinutes * 60000);
        }

        for (let i = 0; i < bookedSlots.length; i++) {
            const slot = bookedSlots[i];
            const slotStart = new Date(slot.date + 'T' + slot.time);
            const slotEnd = new Date(slotStart.getTime() + slot.duration * 60000);

            // Check for overlap
            if (bookingStart < slotEnd && bookingEnd > slotStart) {
                return true;
            }
        }

        return false;
    }

    // Show error message
    function showError(message) {
        formError.textContent = message;
        formError.style.display = 'block';
    }

    // Hide error message
    function hideError() {
        formError.style.display = 'none';
    }

    // Validate form
    function validateForm() {
        const passengers = parseInt(document.getElementById('passengers').value, 10);

        // Check max passengers
        if (passengers > CONFIG.maxPassengers) {
            showError('Maximální počet cestujících je ' + CONFIG.maxPassengers + '.');
            return false;
        }

        // Check for private driver km input
        if (currentServiceType === 'private') {
            const estimatedKm = document.getElementById('estimatedKm').value;
            if (!estimatedKm || parseInt(estimatedKm, 10) < 1) {
                showError('Zadejte prosím odhadovanou vzdálenost v km.');
                return false;
            }
        }

        // Check for double booking
        const pickupDate = document.getElementById('pickupDate').value;
        const pickupTime = document.getElementById('pickupTime').value;
        const estimatedDuration = currentServiceType === 'airport' ? 180 : 120; // minutes

        if (isSlotBooked(pickupDate, pickupTime, estimatedDuration)) {
            showError('Termín je již obsazený. Vyberte prosím jiný čas.');
            return false;
        }

        hideError();
        return true;
    }

    // Generate booking name
    function generateBookingName(pickupLocation, dropoffLocation) {
        return 'Pickup: ' + pickupLocation + ' – Drop-off: ' + dropoffLocation;
    }

    // Submit booking
    function submitBooking(formData) {
        // Prepare booking data
        const bookingData = {
            service: formData.get('serviceType'),
            serviceName: SERVICE_NAMES[formData.get('serviceType')],
            bookingName: generateBookingName(
                formData.get('pickupLocation'),
                formData.get('dropoffLocation')
            ),
            pickupLocation: formData.get('pickupLocation'),
            dropoffLocation: formData.get('dropoffLocation'),
            pickupDate: formData.get('pickupDate'),
            pickupTime: formData.get('pickupTime'),
            passengers: formData.get('passengers'),
            customerName: formData.get('customerName'),
            customerEmail: formData.get('customerEmail'),
            customerPhone: formData.get('customerPhone'),
            pricing: calculatePrice(),
            timestamp: new Date().toISOString()
        };

        // Add service-specific fields
        if (currentServiceType === 'airport') {
            bookingData.flightNumber = formData.get('flightNumber');
            bookingData.numberOfBags = formData.get('numberOfBags');
            bookingData.meetAndGreet = formData.get('meetAndGreet') === 'on';
        } else {
            bookingData.estimatedKm = formData.get('estimatedKm');
            bookingData.numberOfStops = formData.get('numberOfStops');
            bookingData.roundTrip = formData.get('roundTrip') === 'on';
            bookingData.vipOption = formData.get('vipOption') === 'on';
        }

        // Send to API (placeholder)
        fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        })
        .then(function(response) {
            if (!response.ok) {
                // API returned an error status, but for demo we still proceed
                console.warn('API returned status:', response.status);
            }
            return response.json().catch(function() {
                // If JSON parsing fails, return default success for demo
                return { success: true };
            });
        })
        .then(function(apiResult) {
            // Merge API result with booking data
            return { success: apiResult.success !== false, data: bookingData };
        })
        .catch(function(error) {
            // Network error or API unavailable - for demo purposes, show success
            console.warn('Booking API unavailable (demo mode):', error.message);
            return { success: true, data: bookingData };
        })
        .then(function(result) {
            // Store booking data for confirmation
            window.lastBooking = result.data;

            // Show success modal
            showSuccessModal(result.data);
        });
    }

    // Show success modal
    function showSuccessModal(bookingData) {
        modal.classList.remove('active');

        // Update WhatsApp link
        const whatsappConfirm = document.getElementById('whatsappConfirm');
        const message = encodeURIComponent(
            'Dobrý den, právě jsem provedl/a rezervaci:\n' +
            'Služba: ' + bookingData.serviceName + '\n' +
            'Datum: ' + bookingData.pickupDate + ' v ' + bookingData.pickupTime + '\n' +
            'Odkud: ' + bookingData.pickupLocation + '\n' +
            'Kam: ' + bookingData.dropoffLocation
        );
        whatsappConfirm.href = 'https://wa.me/' + CONFIG.whatsappNumber + '?text=' + message;

        successModal.style.display = 'flex';
        successModal.classList.add('active');

        // Send email confirmation placeholder
        sendEmailConfirmation(bookingData);
    }

    // Email confirmation placeholder
    function sendEmailConfirmation(bookingData) {
        // This would integrate with an email service in production
        console.log('Email confirmation would be sent to:', bookingData.customerEmail);
        console.log('Booking details:', bookingData);
    }

    // Close success modal
    document.getElementById('closeSuccess').addEventListener('click', function() {
        successModal.style.display = 'none';
        successModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Form input listeners for live price update
    document.getElementById('pickupLocation').addEventListener('input', updatePriceDisplay);
    document.getElementById('pickupTime').addEventListener('change', updatePriceDisplay);
    document.getElementById('estimatedKm').addEventListener('input', updatePriceDisplay);
    document.getElementById('roundTrip').addEventListener('change', updatePriceDisplay);

    // Form submission
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = new FormData(bookingForm);
        submitBooking(formData);
    });

    // Initialize
    initBookingButtons();

    // Book Now button - scrolls to pricing section
    var bookNowBtn = document.getElementById('book-now-btn');
    if (bookNowBtn) {
        bookNowBtn.addEventListener('click', function() {
            var pricingSection = document.querySelector('.pricing');
            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // WhatsApp Contact button - opens WhatsApp with pre-filled message
    var whatsappBtn = document.getElementById('whatsapp-btn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            var phoneNumber = CONFIG.whatsappNumber;
            var message = encodeURIComponent('Hello, I would like to book an airport transfer from Ostrava.');
            var whatsappUrl = 'https://wa.me/' + phoneNumber + '?text=' + message;
            window.open(whatsappUrl, '_blank');
        });
    }
});

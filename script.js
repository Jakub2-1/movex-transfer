// Movex Transfer - Button Interactivity

document.addEventListener('DOMContentLoaded', function() {
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
            // TODO: Replace with actual phone number before deployment
            var phoneNumber = 'REPLACE_WITH_ACTUAL_NUMBER';
            var message = encodeURIComponent('Hello, I would like to book an airport transfer from Ostrava.');
            var whatsappUrl = 'https://wa.me/' + phoneNumber + '?text=' + message;
            window.open(whatsappUrl, '_blank');
        });
    }
});

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send confirmation email to customer in Czech
 */
async function sendCustomerConfirmation(reservation) {
    const { email, type, date, time, pickup_address, dropoff_airport, passengers_count, flight_number, luggage_count, price } = reservation;
    
    const formattedDate = new Date(date).toLocaleDateString('cs-CZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: #fff; padding: 30px; text-align: center; }
                .header h1 { margin: 0; color: #d4af37; }
                .content { padding: 30px; background: #fff; }
                .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
                .detail-label { color: #666; }
                .detail-value { font-weight: bold; color: #1a1a1a; }
                .price-box { background: #f8f8f8; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; }
                .price { font-size: 28px; color: #25d366; font-weight: bold; }
                .footer { background: #1a1a1a; color: #888; padding: 20px; text-align: center; font-size: 12px; }
                .status { display: inline-block; padding: 6px 16px; background: #ffd700; color: #1a1a1a; border-radius: 20px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚗 Movex Transfer</h1>
                <p>Potvrzení rezervace</p>
            </div>
            <div class="content">
                <p>Vážený zákazníku,</p>
                <p>děkujeme za Vaši rezervaci! Níže naleznete podrobnosti o Vaší jízdě:</p>
                
                <div class="detail-row">
                    <span class="detail-label">Typ služby:</span>
                    <span class="detail-value">${type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Datum:</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Čas vyzvednutí:</span>
                    <span class="detail-value">${time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Místo vyzvednutí:</span>
                    <span class="detail-value">${pickup_address}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cílová destinace:</span>
                    <span class="detail-value">${dropoff_airport}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Počet cestujících:</span>
                    <span class="detail-value">${passengers_count}</span>
                </div>
                ${flight_number ? `
                <div class="detail-row">
                    <span class="detail-label">Číslo letu:</span>
                    <span class="detail-value">${flight_number}</span>
                </div>
                ` : ''}
                ${luggage_count ? `
                <div class="detail-row">
                    <span class="detail-label">Počet zavazadel:</span>
                    <span class="detail-value">${luggage_count}</span>
                </div>
                ` : ''}
                
                <div class="price-box">
                    <p style="margin: 0 0 10px 0;">Celková cena:</p>
                    <span class="price">${price} Kč</span>
                    <p style="margin: 10px 0 0 0;"><span class="status">Čeká na potvrzení</span></p>
                </div>
                
                <p style="margin-top: 30px;">Budeme Vás kontaktovat pro potvrzení rezervace. V případě dotazů nás neváhejte kontaktovat.</p>
                <p>S pozdravem,<br><strong>Tým Movex Transfer</strong></p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Movex Transfer. Všechna práva vyhrazena.</p>
            </div>
        </body>
        </html>
    `;

    try {
        const result = await resend.emails.send({
            from: 'Movex Transfer <rezervace@movextransfer.cz>',
            to: [email],
            subject: `Potvrzení rezervace - ${dropoff_airport} - ${formattedDate}`,
            html
        });
        console.log('Customer email sent:', result);
        return result;
    } catch (error) {
        console.error('Failed to send customer email:', error);
        throw error;
    }
}

/**
 * Send internal notification email to owner
 */
async function sendOwnerNotification(reservation) {
    const { email, type, date, time, pickup_address, dropoff_airport, passengers_count, flight_number, luggage_count, price } = reservation;
    
    const formattedDate = new Date(date).toLocaleDateString('cs-CZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const html = `
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                .header { background: #d4af37; color: #1a1a1a; padding: 20px; text-align: center; }
                .header h1 { margin: 0; }
                .content { padding: 30px; background: #fff; }
                .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
                .detail-label { color: #666; }
                .detail-value { font-weight: bold; color: #1a1a1a; }
                .price-box { background: #25d366; color: #fff; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: center; }
                .price { font-size: 28px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📥 Nová rezervace!</h1>
            </div>
            <div class="content">
                <p><strong>Přišla nová rezervace od zákazníka:</strong></p>
                
                <div class="detail-row">
                    <span class="detail-label">Email zákazníka:</span>
                    <span class="detail-value">${email}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Typ služby:</span>
                    <span class="detail-value">${type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Datum:</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Čas vyzvednutí:</span>
                    <span class="detail-value">${time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Místo vyzvednutí:</span>
                    <span class="detail-value">${pickup_address}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cílová destinace:</span>
                    <span class="detail-value">${dropoff_airport}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Počet cestujících:</span>
                    <span class="detail-value">${passengers_count}</span>
                </div>
                ${flight_number ? `
                <div class="detail-row">
                    <span class="detail-label">Číslo letu:</span>
                    <span class="detail-value">${flight_number}</span>
                </div>
                ` : ''}
                ${luggage_count ? `
                <div class="detail-row">
                    <span class="detail-label">Počet zavazadel:</span>
                    <span class="detail-value">${luggage_count}</span>
                </div>
                ` : ''}
                
                <div class="price-box">
                    <p style="margin: 0 0 10px 0;">Cena:</p>
                    <span class="price">${price} Kč</span>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const result = await resend.emails.send({
            from: 'Movex Transfer <system@movextransfer.cz>',
            to: [process.env.OWNER_EMAIL],
            subject: `🚗 Nová rezervace: ${dropoff_airport} - ${formattedDate} v ${time}`,
            html
        });
        console.log('Owner notification sent:', result);
        return result;
    } catch (error) {
        console.error('Failed to send owner notification:', error);
        throw error;
    }
}

module.exports = {
    sendCustomerConfirmation,
    sendOwnerNotification
};

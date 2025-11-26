import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | All\'Arco Apartment',
  description: 'Terms of Service for All\'Arco Apartment Venice - Rules and conditions for booking and staying at our apartment.',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#C4A572] hover:text-[#D4B582] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-[#C4A572]/10 rounded-xl">
            <FileText className="w-8 h-8 text-[#C4A572]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Terms of Service</h1>
            <p className="text-gray-400 mt-1">Last updated: January 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
              <p>
                By booking and staying at All&apos;Arco Apartment, you agree to these Terms of Service. Please read them carefully before making a reservation. If you do not agree with these terms, please do not proceed with your booking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Booking and Reservation</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reservations are confirmed upon receipt of payment and booking confirmation email.</li>
                <li>The person making the booking must be at least 18 years old and will be responsible for all guests.</li>
                <li>Accurate guest information must be provided as required by Italian law.</li>
                <li>Maximum occupancy must not exceed the stated capacity of the apartment.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Check-in and Check-out</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Check-in:</strong> From 3:00 PM (15:00)</li>
                <li><strong>Check-out:</strong> By 11:00 AM (11:00)</li>
                <li>Early check-in or late check-out may be available upon request and subject to availability and additional fees.</li>
                <li>All guests must present valid identification documents upon arrival as required by Italian law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Payment Terms</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Full payment is required at the time of booking unless otherwise specified.</li>
                <li>Prices are in Euros (EUR) and include all applicable taxes except the Venice tourist tax.</li>
                <li><strong>Venice Tourist Tax:</strong> A city tax of approximately &euro;3-5 per person per night applies and is payable separately.</li>
                <li>A security deposit may be required and will be refunded after inspection of the apartment.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. House Rules</h2>
              <p className="mb-4">Guests must adhere to the following rules:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>No smoking:</strong> The apartment is strictly non-smoking.</li>
                <li><strong>No parties or events:</strong> The apartment is for residential use only.</li>
                <li><strong>Quiet hours:</strong> Please respect neighbors between 10:00 PM and 8:00 AM.</li>
                <li><strong>Pets:</strong> Not permitted unless explicitly agreed in advance.</li>
                <li><strong>Respect the property:</strong> Treat the apartment and its contents with care.</li>
                <li><strong>Garbage disposal:</strong> Please follow Venice&apos;s waste separation guidelines.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Liability and Damages</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Guests are responsible for any damage caused to the property during their stay.</li>
                <li>Damages will be deducted from the security deposit or charged to the payment method on file.</li>
                <li>We are not liable for loss or damage to guests&apos; personal belongings.</li>
                <li>We are not responsible for disruptions beyond our control (utility outages, construction, etc.).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Access and Entry</h2>
              <p>
                We reserve the right to enter the apartment in case of emergency or with reasonable notice for maintenance purposes. We respect your privacy and will minimize any disruption.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Cancellation Policy</h2>
              <p>
                Please refer to our <Link href="/cancellation-policy" className="text-[#C4A572] hover:text-[#D4B582]">Cancellation Policy</Link> for detailed information about cancellations and refunds.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Governing Law</h2>
              <p>
                These Terms of Service are governed by the laws of Italy. Any disputes arising from your stay will be subject to the exclusive jurisdiction of the courts of Venice, Italy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Changes will be effective upon posting to our website. Your continued use of our services constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Contact Us</h2>
              <p>
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p><strong>All&apos;Arco Apartment</strong></p>
                <p>Venice, Italy</p>
                <p>Email: <a href="mailto:support@allarcoapartment.com" className="text-[#C4A572] hover:text-[#D4B582]">support@allarcoapartment.com</a></p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

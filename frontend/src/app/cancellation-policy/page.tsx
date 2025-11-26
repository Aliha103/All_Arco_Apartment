import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CalendarX } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cancellation Policy | All\'Arco Apartment',
  description: 'Cancellation Policy for All\'Arco Apartment Venice - Information about cancellations, refunds, and modifications.',
};

export default function CancellationPolicyPage() {
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
            <CalendarX className="w-8 h-8 text-[#C4A572]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Cancellation Policy</h1>
            <p className="text-gray-400 mt-1">Last updated: January 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="space-y-8 text-gray-300">
            {/* Summary Box */}
            <div className="p-6 bg-[#C4A572]/10 border border-[#C4A572]/20 rounded-xl">
              <h3 className="text-lg font-semibold text-[#C4A572] mb-3">Quick Summary</h3>
              <ul className="space-y-2 text-sm">
                <li><strong>Free cancellation:</strong> Up to 14 days before check-in</li>
                <li><strong>50% refund:</strong> 7-14 days before check-in</li>
                <li><strong>No refund:</strong> Less than 7 days before check-in</li>
              </ul>
            </div>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Standard Cancellation Policy</h2>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">More than 14 days before check-in</h4>
                  <p className="text-green-400 font-medium">Full refund (100%)</p>
                  <p className="text-sm mt-1">Cancel for free and receive a complete refund of your booking amount.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">7 to 14 days before check-in</h4>
                  <p className="text-yellow-400 font-medium">Partial refund (50%)</p>
                  <p className="text-sm mt-1">Receive 50% of your total booking amount as a refund.</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Less than 7 days before check-in</h4>
                  <p className="text-red-400 font-medium">No refund (0%)</p>
                  <p className="text-sm mt-1">Cancellations within 7 days of check-in are non-refundable.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. How to Cancel</h2>
              <p className="mb-4">To cancel your booking:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Log in to your account on our website</li>
                <li>Go to &quot;My Bookings&quot; and select the reservation you wish to cancel</li>
                <li>Click &quot;Cancel Booking&quot; and confirm your cancellation</li>
                <li>You will receive a confirmation email with refund details (if applicable)</li>
              </ol>
              <p className="mt-4">
                Alternatively, you can email us at <a href="mailto:support@allarcoapartment.com" className="text-[#C4A572] hover:text-[#D4B582]">support@allarcoapartment.com</a> with your booking reference.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Refund Processing</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Refunds are processed within 5-10 business days of cancellation confirmation.</li>
                <li>Refunds will be credited to the original payment method used for booking.</li>
                <li>Bank processing times may vary; please allow up to 14 days for the refund to appear in your account.</li>
                <li>Processing fees charged by payment providers are non-refundable.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Booking Modifications</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Date changes are subject to availability and may result in price adjustments.</li>
                <li>Modifications requested less than 7 days before check-in may be treated as a new booking.</li>
                <li>Shortening your stay after check-in is treated as an early departure (no refund for unused nights).</li>
                <li>Contact us as soon as possible for any modification requests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. No-Show Policy</h2>
              <p>
                If you do not arrive on your scheduled check-in date without prior notice, your booking will be marked as a &quot;no-show&quot; and no refund will be provided. We will attempt to contact you using the information provided during booking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Early Departure</h2>
              <p>
                If you choose to depart before your scheduled check-out date, you will not be entitled to a refund for the unused nights. The full booking amount remains applicable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Exceptional Circumstances</h2>
              <p className="mb-4">We may consider full or partial refunds in exceptional circumstances, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Government travel restrictions affecting your travel</li>
                <li>Natural disasters or severe weather conditions</li>
                <li>Documented medical emergencies (with appropriate documentation)</li>
                <li>Death in the immediate family</li>
              </ul>
              <p className="mt-4">
                Each case will be reviewed individually. Please contact us with supporting documentation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Cancellation by All&apos;Arco Apartment</h2>
              <p className="mb-4">In the rare event that we must cancel your booking:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You will receive a full refund of all payments made.</li>
                <li>We will assist you in finding alternative accommodation where possible.</li>
                <li>We will notify you as soon as possible with alternative options.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Contact Us</h2>
              <p>
                For cancellation requests or questions about this policy, please contact us:
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

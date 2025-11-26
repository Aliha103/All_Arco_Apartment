import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | All\'Arco Apartment',
  description: 'Privacy Policy for All\'Arco Apartment Venice - How we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
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
            <Shield className="w-8 h-8 text-[#C4A572]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Privacy Policy</h1>
            <p className="text-gray-400 mt-1">Last updated: January 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p>
                All&apos;Arco Apartment (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a booking at our Venice apartment.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
              <p className="mb-4">We may collect information about you in various ways, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal Data:</strong> Name, email address, phone number, postal address, date of birth, and identification documents as required by Italian law for guest registration.</li>
                <li><strong>Payment Information:</strong> Credit card details, billing address, and transaction history (processed securely through our payment providers).</li>
                <li><strong>Booking Information:</strong> Check-in/check-out dates, number of guests, special requests, and communication history.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies when you visit our website.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and manage your bookings</li>
                <li>Communicate with you about your reservation</li>
                <li>Comply with Italian tourism regulations and guest registration requirements</li>
                <li>Process payments securely</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Improve our services and website experience</li>
                <li>Respond to your inquiries and support requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Legal Basis for Processing (GDPR)</h2>
              <p className="mb-4">Under the General Data Protection Regulation (GDPR), we process your data based on:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Contract Performance:</strong> Processing necessary to fulfill your booking</li>
                <li><strong>Legal Obligation:</strong> Compliance with Italian law requiring guest registration</li>
                <li><strong>Legitimate Interests:</strong> Improving our services and communicating with you</li>
                <li><strong>Consent:</strong> Marketing communications and non-essential cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Data Sharing and Disclosure</h2>
              <p className="mb-4">We may share your information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Italian Authorities:</strong> Guest information as required by law (Alloggiati Web)</li>
                <li><strong>Payment Processors:</strong> Secure processing of your transactions</li>
                <li><strong>Service Providers:</strong> Cleaning, maintenance, and other essential services</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="mt-4">We do not sell your personal information to third parties.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Data Retention</h2>
              <p>
                We retain your personal data for as long as necessary to fulfill the purposes outlined in this policy, comply with legal obligations (Italian law requires keeping guest records for 5 years), resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
              <p className="mb-4">Under GDPR, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
                <li>Lodge a complaint with the Italian Data Protection Authority (Garante)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security assessments.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. International Transfers</h2>
              <p>
                Your data is primarily processed within the European Economic Area (EEA). If we transfer data outside the EEA, we ensure appropriate safeguards are in place in compliance with GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Contact Us</h2>
              <p>
                For any questions about this Privacy Policy or to exercise your rights, please contact us at:
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

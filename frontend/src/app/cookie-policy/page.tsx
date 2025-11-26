import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Cookie } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy | All\'Arco Apartment',
  description: 'Cookie Policy for All\'Arco Apartment Venice - Information about how we use cookies on our website.',
};

export default function CookiePolicyPage() {
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
            <Cookie className="w-8 h-8 text-[#C4A572]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Cookie Policy</h1>
            <p className="text-gray-400 mt-1">Last updated: January 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners information about how their site is being used.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Cookies</h2>
              <p className="mb-4">All&apos;Arco Apartment uses cookies for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly, including authentication and booking processes.</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings for a better experience.</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website so we can improve it.</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (only with your consent).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Types of Cookies We Use</h2>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Essential Cookies</h4>
                  <p className="text-sm mb-2">These cookies are necessary for the website to function and cannot be switched off.</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2">Cookie</th>
                        <th className="text-left py-2">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="py-2">session_id</td>
                        <td className="py-2">User authentication</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2">csrf_token</td>
                        <td className="py-2">Security</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr>
                        <td className="py-2">cookie_consent</td>
                        <td className="py-2">Remember your cookie preferences</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Functional Cookies</h4>
                  <p className="text-sm mb-2">These cookies enable enhanced functionality and personalization.</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2">Cookie</th>
                        <th className="text-left py-2">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="py-2">language</td>
                        <td className="py-2">Remember language preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr>
                        <td className="py-2">currency</td>
                        <td className="py-2">Remember currency preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Analytics Cookies</h4>
                  <p className="text-sm mb-2">These cookies help us understand how visitors interact with our website.</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2">Cookie</th>
                        <th className="text-left py-2">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="py-2">_ga</td>
                        <td className="py-2">Google Analytics - distinguish users</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="py-2">_gid</td>
                        <td className="py-2">Google Analytics - distinguish users</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Third-Party Cookies</h2>
              <p className="mb-4">We may use third-party services that set their own cookies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google Analytics:</strong> Website traffic analysis</li>
                <li><strong>Stripe:</strong> Payment processing</li>
                <li><strong>Google Maps:</strong> Location and directions</li>
              </ul>
              <p className="mt-4">
                These third parties have their own privacy policies governing the use of their cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Managing Cookies</h2>
              <p className="mb-4">You can control and manage cookies in several ways:</p>

              <h4 className="font-semibold text-white mb-2">Browser Settings</h4>
              <p className="mb-4">Most browsers allow you to:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>View what cookies are stored and delete them individually</li>
                <li>Block third-party cookies</li>
                <li>Block all cookies</li>
                <li>Clear all cookies when you close the browser</li>
              </ul>

              <p className="mb-4">Please note that blocking all cookies may affect website functionality.</p>

              <h4 className="font-semibold text-white mb-2">Browser-Specific Instructions</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#C4A572] hover:text-[#D4B582]">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-[#C4A572] hover:text-[#D4B582]">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#C4A572] hover:text-[#D4B582]">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-[#C4A572] hover:text-[#D4B582]">Microsoft Edge</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Your Consent</h2>
              <p>
                When you first visit our website, you will be presented with a cookie consent banner. You can choose to accept all cookies, reject non-essential cookies, or customize your preferences. You can change your cookie preferences at any time through our website settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices or legal requirements. We encourage you to review this page periodically for the latest information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Contact Us</h2>
              <p>
                If you have any questions about our use of cookies, please contact us:
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

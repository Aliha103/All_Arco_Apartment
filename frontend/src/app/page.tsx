import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">All'Arco Apartment</h1>
          <nav className="flex gap-4">
            <Link href="/auth/login" className="text-gray-700 hover:text-blue-600">
              Login
            </Link>
            <Link
              href="/auth/register"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Your Perfect Stay in Venice
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Experience the magic of Venice from our beautiful apartment. Located in the heart of the city,
            All'Arco Apartment offers comfort, style, and authentic Venetian charm.
          </p>
          <Link
            href="/book"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Book Your Stay
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">🏛️</div>
            <h3 className="text-xl font-semibold mb-2">Prime Location</h3>
            <p className="text-gray-600">
              Steps away from Venice's iconic landmarks and attractions
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">✨</div>
            <h3 className="text-xl font-semibold mb-2">Modern Comfort</h3>
            <p className="text-gray-600">
              Fully equipped apartment with all modern amenities
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">Instant Booking</h3>
            <p className="text-gray-600">
              Easy online booking with secure payment processing
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mt-16 text-center">
          <div>
            <div className="text-4xl font-bold text-blue-600">4.9</div>
            <div className="text-gray-600">Guest Rating</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600">500+</div>
            <div className="text-gray-600">Happy Guests</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600">24/7</div>
            <div className="text-gray-600">Support</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-600">100%</div>
            <div className="text-gray-600">Satisfaction</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">All'Arco Apartment</h3>
          <p className="text-gray-400 mb-4">Venice, Italy</p>
          <div className="flex justify-center gap-6 text-sm">
            <span>support@allarcoapartment.com</span>
            <span>•</span>
            <span>check-in@allarcoapartment.com</span>
          </div>
          <Link href="/pms" className="text-gray-500 hover:text-gray-400 text-sm mt-4 inline-block">
            Team Login
          </Link>
        </div>
      </footer>
    </div>
  );
}

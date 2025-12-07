'use client';

import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronDown, CheckCircle, MapPin, MessageCircle, Sparkles, Key, Heart } from 'lucide-react';
import { api } from '@/lib/api';

// ============================================================================
// TYPES
// ============================================================================
interface Review {
  id: string;
  guest_name: string;
  location?: string;
  rating: number;
  title?: string;
  text: string;
  stay_date?: string;
  created_at?: string;
}

interface RatingCategory {
  key: string;
  label: string;
  score: number;
  icon: React.ElementType;
}

const RATING_CATEGORIES: RatingCategory[] = [
  { key: 'cleanliness', label: 'Cleanliness', score: 9.9, icon: Sparkles },
  { key: 'communication', label: 'Communication', score: 10, icon: MessageCircle },
  { key: 'location', label: 'Location', score: 9.8, icon: MapPin },
  { key: 'checkIn', label: 'Check-in', score: 9.9, icon: Key },
  { key: 'value', label: 'Value', score: 9.6, icon: Heart },
  { key: 'accuracy', label: 'Accuracy', score: 9.8, icon: CheckCircle },
];

// ============================================================================
// CONSTANTS
// ============================================================================
const INITIAL_REVIEWS = 3;
const LOAD_MORE_COUNT = 3;

// Animation configs - optimized for 60fps
const springConfig = { type: 'spring', stiffness: 400, damping: 30 } as const;
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: springConfig },
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Rating bar component - memoized for performance
const RatingBar = memo(function RatingBar({
  category
}: {
  category: RatingCategory
}) {
  const Icon = category.icon;
  const percentage = (category.score / 10) * 100;

  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-600 w-28 flex-shrink-0">{category.label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
          className="h-full bg-[#C4A572] rounded-full"
        />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{category.score}</span>
    </div>
  );
});

// Single review card - memoized
const ReviewCard = memo(function ReviewCard({
  review,
  index
}: {
  review: Review;
  index: number;
}) {
  // Generate initials for avatar
  const initials = useMemo(() =>
    review.guest_name.split(' ').map(n => n[0]).join('').slice(0, 2),
    [review.guest_name]
  );

  // Generate avatar color based on name
  const avatarColor = useMemo(() => {
    const colors = [
      'from-rose-400 to-rose-600',
      'from-blue-400 to-blue-600',
      'from-emerald-400 to-emerald-600',
      'from-purple-400 to-purple-600',
      'from-amber-400 to-amber-600',
      'from-cyan-400 to-cyan-600',
    ];
    const hash = review.guest_name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, [review.guest_name]);

  return (
    <motion.article
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-gray-100 p-5 sm:p-6 rounded-2xl relative group
                 hover:shadow-lg hover:border-gray-200 transition-all duration-300"
      whileHover={{ y: -4 }}
    >
      {/* Quote icon */}
      <Quote className="w-8 h-8 text-[#C4A572]/10 absolute top-4 right-4
                        group-hover:text-[#C4A572]/20 transition-colors" />

      {/* Header with avatar and rating */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor}
                          flex items-center justify-center text-white font-semibold text-sm
                          shadow-sm`}>
            {initials}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{review.guest_name}</h4>
            <p className="text-xs sm:text-sm text-gray-500">{review.location}</p>
          </div>
        </div>

        {/* Rating badge */}
        <div className="flex items-center gap-1 bg-[#C4A572]/10 px-2 py-1 rounded-lg">
          <Star className="w-3.5 h-3.5 fill-[#C4A572] text-[#C4A572]" />
          <span className="text-sm font-bold text-[#C4A572]">{review.rating}</span>
        </div>
      </div>

      {/* Review text */}
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
        &ldquo;{review.text}&rdquo;
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                i < Math.round(review.rating / 2)
                  ? 'fill-[#C4A572] text-[#C4A572]'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          ))}
        </div>
        <time className="text-xs text-gray-400">{review.stay_date || review.created_at || ''}</time>
      </div>
    </motion.article>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ReviewsSection({ initialReviews = [], loading = false }: { initialReviews?: Review[]; loading?: boolean }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [visibleCount, setVisibleCount] = useState(INITIAL_REVIEWS);
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(loading || initialReviews.length === 0);

  useEffect(() => {
    if (initialReviews.length) {
      setReviews(initialReviews);
      setFetching(false);
    }
  }, [initialReviews]);

  useEffect(() => {
    if (initialReviews.length) return;
    const load = async () => {
      setFetching(true);
      try {
        const res = await api.reviews.list();
        setReviews(res.data || []);
      } catch (error) {
        console.error('Failed to load reviews', error);
        setReviews([]);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [initialReviews.length]);

  const totalReviews = reviews.length;
  const overallRating = useMemo(() => {
    if (!totalReviews) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return Number((sum / totalReviews).toFixed(1));
  }, [reviews, totalReviews]);

  const ratingLabel = useMemo(() => {
    if (overallRating >= 9.5) return 'Exceptional';
    if (overallRating >= 9.0) return 'Wonderful';
    if (overallRating >= 8.5) return 'Excellent';
    if (overallRating >= 8.0) return 'Very Good';
    return 'Good';
  }, [overallRating]);

  const visibleReviews = useMemo(
    () => reviews.slice(0, visibleCount),
    [reviews, visibleCount]
  );

  const hasMore = visibleCount < reviews.length;
  const remainingCount = reviews.length - visibleCount;

  const handleLoadMore = useCallback(() => {
    setIsLoading(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, reviews.length));
        setIsLoading(false);
      }, 150);
    });
  }, [reviews.length]);

  return (
    <section className="py-16 sm:py-20 lg:py-28" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={springConfig}
          className="text-center max-w-2xl mx-auto mb-10 sm:mb-14"
        >
          <span className="text-[#C4A572] font-medium tracking-wider uppercase text-xs sm:text-sm">
            Reviews
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mt-3 mb-6">
            What Our Guests Say
          </h2>

          {/* Overall Rating - Booking.com style */}
          <div className="inline-flex items-center gap-4 bg-gray-50 rounded-2xl p-4 sm:p-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#C4A572] rounded-xl flex items-center justify-center">
              <span className="text-2xl sm:text-3xl font-bold text-white">{overallRating || '—'}</span>
            </div>
            <div className="text-left">
              <p className="text-lg sm:text-xl font-semibold text-gray-900">{ratingLabel}</p>
              <p className="text-sm text-gray-500">
                {totalReviews ? `${totalReviews} verified reviews` : fetching ? 'Loading reviews...' : 'No reviews yet'}
              </p>
              <div className="flex items-center gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#C4A572] text-[#C4A572]" />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rating Categories Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springConfig, delay: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-14 max-w-4xl mx-auto"
        >
          {RATING_CATEGORIES.map((category) => (
            <RatingBar key={category.key} category={category} />
          ))}
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {visibleReviews.map((review, index) => (
              <ReviewCard key={review.id} review={review} index={index} />
            ))}
          </AnimatePresence>
        </div>

        {/* Load More Button */}
        {hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-8 sm:mt-12"
          >
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white
                         font-medium rounded-full hover:bg-gray-800 transition-all duration-300
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-[0.98] touch-manipulation"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Loading...
                </>
              ) : (
                <>
                  See More Reviews
                  <span className="text-white/60">({remainingCount} more)</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* All reviews loaded message */}
        {!hasMore && visibleCount > INITIAL_REVIEWS && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-8 text-gray-500 text-sm"
          >
            You&apos;ve seen all {reviews.length} reviews
          </motion.p>
        )}
      </div>
    </section>
  );
}

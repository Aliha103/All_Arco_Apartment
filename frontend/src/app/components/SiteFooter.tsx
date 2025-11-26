import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import { FOOTER_LINKS, SOCIAL_LINKS } from '@/app/components/siteData';

const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="w-full px-6 md:px-8 lg:px-12 py-12 mx-auto">
        <div className="grid gap-10 lg:gap-14 md:grid-cols-[2.4fr_1fr_1fr] lg:grid-cols-[3fr_1fr_1fr_1fr] items-start">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10 lg:max-w-3xl">
              <div className="flex items-start gap-3 lg:flex-1">
                <Image src="/logos/logo-icon.svg" alt="All'Arco Apartment" width={64} height={64} className="object-contain" />
                <div className="space-y-2 lg:max-w-lg">
                  <p className="text-lg font-semibold text-gray-900 leading-tight">All&apos;Arco Apartment</p>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Boutique canal-view apartment in the heart of Venice. Focused on elevated stays and clear communication.
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-800 space-y-1 lg:min-w-[240px]">
                <p className="font-semibold text-gray-900">Contact</p>
                <p>support@allarcoapartment.com</p>
                <p>Venice, Italy</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-900 hover:text-white transition-all duration-200"
                  whileHover={{ y: -2 }}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a href={link.href} className="hover:text-gray-900 transition-colors">{link.label}</a>
                    ) : (
                      <span>{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 mt-10 border-t border-gray-100 text-sm text-gray-500">
          <span>© {currentYear} All&apos;Arco Apartment</span>
          <span className="flex items-center gap-1">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            </motion.span>
            Made in Venice
          </span>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;

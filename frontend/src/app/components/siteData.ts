import { Facebook, Instagram, Mail } from 'lucide-react';

export const FOOTER_LINKS = {
  Explore: [
    { label: 'About', href: '#about' },
    { label: 'Features', href: '#features' },
  ],
  Services: [
    { label: 'Reservations', href: '#booking' },
    { label: 'My Reservation', href: '/my-reservation' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/user_data_privacy_policy' },
  ],
};

export const SOCIAL_LINKS = [
  { icon: Facebook, href: 'https://facebook.com/allarcoapartment', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com/allarcoapartment', label: 'Instagram' },
  { icon: Mail, href: 'mailto:support@allarcoapartment.com', label: 'Email' },
];

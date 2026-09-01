import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PublicPropertyExperience } from '@/app/p/[slug]/PublicPropertyClient';
import type { PublicProperty } from '@/lib/public-property';

const property: PublicProperty = {
  id: 'story-property-1',
  slug: 'sunlit-3-bhk-near-balewadi-high-street-ia9vxm',
  title: 'Sunlit 3 BHK near Balewadi High Street',
  description: 'A well-planned three-bedroom apartment with generous daylight, an efficient layout, and practical storage. The living and dining area opens to a broad balcony, while all bedrooms remain separated from the main entertaining zone.\n\nThe property is presented directly by a West Pune advisor. Contact the broker to confirm current availability, documents, final terms, and a suitable time to view it.',
  price: 16_500_000,
  property_type: 'APARTMENT',
  status: 'AVAILABLE',
  city: 'Pune',
  area: 'Balewadi',
  bhk: 3,
  square_feet: 1480,
  amenities: ['parking', 'security', 'lift', 'power_backup', 'gym', 'garden'],
  images: [
    {
      id: 'photo-1',
      url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85',
      thumbnail_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=500&q=80',
      display_order: 0,
      caption: 'Living and dining area',
    },
    {
      id: 'photo-2',
      url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=85',
      thumbnail_url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=500&q=80',
      display_order: 1,
      caption: 'Primary bedroom',
    },
    {
      id: 'photo-3',
      url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=85',
      thumbnail_url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=500&q=80',
      display_order: 2,
      caption: 'Kitchen',
    },
    {
      id: 'photo-4',
      url: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=85',
      thumbnail_url: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=500&q=80',
      display_order: 3,
      caption: 'Balcony and view',
    },
  ],
  agency_name: 'Northstar Realty',
  brand_color: '#174D3C',
  theme_mode: 'LIGHT',
  listing_attribution: 'BROKER_LISTED',
  broker: {
    name: 'Meera Kulkarni',
    phone: '+91 90000 00321',
    whatsapp: '+91 90000 00321',
    agency_name: 'Northstar Realty',
    professional_title: 'West Pune Property Advisor',
    service_areas: ['Baner', 'Balewadi', 'Wakad'],
  },
};

const meta = {
  title: 'Public Experience/Property Page',
  component: PublicPropertyExperience,
  args: {
    analyticsEnabled: false,
    property,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PublicPropertyExperience>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  args: {
    property: {
      ...property,
      brand_color: '#E0A84C',
      theme_mode: 'DARK',
    },
  },
};

export const NoPhotos: Story = {
  args: {
    property: {
      ...property,
      images: [],
    },
  },
};

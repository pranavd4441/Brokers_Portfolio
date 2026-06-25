'use client';

import { useEffect } from 'react';

interface AnalyticsTrackerProps {
  propertyId: string;
}

export default function AnalyticsTracker({ propertyId }: AnalyticsTrackerProps) {
  useEffect(() => {
    // 1. Log PAGE_VIEW on mount
    const logPageView = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        
        await fetch(`${apiUrl}/analytics/log/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            property: propertyId,
            event_type: 'PAGE_VIEW',
          }),
        });
      } catch (error) {
        console.error('[Analytics] Failed to log page view:', error);
      }
    };

    logPageView();

    // 2. Log CTA clicks in the background
    const logClickEvent = async (eventType: 'WHATSAPP_CLICK' | 'PHONE_CLICK') => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        await fetch(`${apiUrl}/analytics/log/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            property: propertyId,
            event_type: eventType,
          }),
        });
      } catch (error) {
        console.error(`[Analytics] Failed to log click event:`, error);
      }
    };

    // Attach click listeners to CTA elements
    const attachClickListener = (id: string, eventType: 'WHATSAPP_CLICK' | 'PHONE_CLICK') => {
      const element = document.getElementById(id);
      if (element) {
        const handler = () => logClickEvent(eventType);
        element.addEventListener('click', handler);
        return () => element.removeEventListener('click', handler);
      }
      return () => {};
    };

    // Delay attachment slightly to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      const cleanups = [
        attachClickListener('whatsapp-header-cta', 'WHATSAPP_CLICK'),
        attachClickListener('whatsapp-main-cta', 'WHATSAPP_CLICK'),
        attachClickListener('whatsapp-mobile-cta', 'WHATSAPP_CLICK'),
        attachClickListener('phone-main-cta', 'PHONE_CLICK'),
        attachClickListener('phone-mobile-cta', 'PHONE_CLICK'),
      ];

      return () => {
        cleanups.forEach((cleanup) => cleanup());
      };
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [propertyId]);

  return null; // Invisible component
}

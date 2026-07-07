'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';

interface TallyFormProps {
  formId: string;
  hideTitle?: boolean;
  alignLeft?: boolean;
}

export default function TallyForm({ formId, hideTitle = true, alignLeft = false }: TallyFormProps) {
  const searchParams = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Compute iframe URL parameters synchronously
  const params = new URLSearchParams();
  if (hideTitle) params.append('hideTitle', '1');
  if (alignLeft) params.append('alignLeft', '1');
  params.append('transparentBackground', '1');
  params.append('dynamicHeight', '1');
  
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');
  
  if (utmSource) params.append('utm_source', utmSource);
  if (utmMedium) params.append('utm_medium', utmMedium);
  if (utmCampaign) params.append('utm_campaign', utmCampaign);

  const iframeSrc = `https://tally.so/embed/${formId}?${params.toString()}`;

  useEffect(() => {
    // If Tally is already loaded (e.g. fast navigation), force an embed reload
    if (typeof window !== 'undefined' && (window as any).Tally) {
      (window as any).Tally.loadEmbeds();
    }

    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'string') return;

      // Tally dynamic height resize
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'Tally.FormHeightChanged' && iframeRef.current) {
          iframeRef.current.style.height = `${data.payload.height}px`;
        }
      } catch {
        // Not a JSON message — check for FormSubmitted
      }

      // Listen for form submission to trigger WhatsApp redirect
      if (e.data.includes('Tally.FormSubmitted')) {
        const message = "Hi Amine, I just submitted my application for the IELTS Lab Oran and I would like to confirm my seat.";
        const encodedMessage = encodeURIComponent(message);
        const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '213780343103';
        const waUrl = `https://wa.me/${waNumber}?text=${encodedMessage}`;
        setTimeout(() => {
          window.location.href = waUrl;
        }, 1000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [iframeSrc]);

  return (
    <>
      <Script 
        src="https://tally.so/widgets/embed.js" 
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined' && (window as any).Tally) {
            (window as any).Tally.loadEmbeds();
          }
        }}
      />
      <iframe 
        ref={iframeRef}
        data-tally-src={iframeSrc} 
        loading="lazy" 
        width="100%" 
        height="600"
        frameBorder="0" 
        marginHeight={0} 
        marginWidth={0} 
        title="IELTS Lab Oran Form"
        className="w-full border-none m-0 p-0 block"
        style={{ minHeight: '600px', display: 'block' }}
      ></iframe>
    </>
  );
}

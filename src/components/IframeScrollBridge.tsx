import { useEffect, useRef } from 'react';

interface IframeScrollBridgeProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onScrollChange: (data: { scrollPercent: number; scrollY: number; viewportHeight: number }) => void;
  isActive: boolean;
}

export default function IframeScrollBridge({ iframeRef, onScrollChange, isActive }: IframeScrollBridgeProps) {
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!isActive || !iframeRef.current || injectedRef.current) return;

    const iframe = iframeRef.current;

    const injectScrollTracker = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const script = iframeDoc.createElement('script');
        script.textContent = `
          (function() {
            let ticking = false;

            function calculateScrollData() {
              const scrollY = window.scrollY || window.pageYOffset;
              const viewportHeight = window.innerHeight;
              const documentHeight = document.documentElement.scrollHeight;
              const maxScroll = documentHeight - viewportHeight;
              const scrollPercent = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;

              return {
                scrollPercent: Math.min(100, Math.max(0, scrollPercent)),
                scrollY: scrollY,
                viewportHeight: viewportHeight,
                documentHeight: documentHeight
              };
            }

            function sendScrollUpdate() {
              const data = calculateScrollData();
              window.parent.postMessage({
                type: 'iframe-scroll',
                data: data
              }, '*');
              ticking = false;
            }

            window.addEventListener('scroll', function() {
              if (!ticking) {
                window.requestAnimationFrame(sendScrollUpdate);
                ticking = true;
              }
            }, { passive: true });

            sendScrollUpdate();
          })();
        `;

        iframeDoc.head.appendChild(script);
        injectedRef.current = true;
      } catch (error) {
        console.error('Failed to inject scroll tracker:', error);
      }
    };

    const handleIframeLoad = () => {
      setTimeout(injectScrollTracker, 100);
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      injectScrollTracker();
    } else {
      iframe.addEventListener('load', handleIframeLoad);
    }

    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [iframeRef, isActive]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'iframe-scroll' && isActive) {
        onScrollChange(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onScrollChange, isActive]);

  return null;
}

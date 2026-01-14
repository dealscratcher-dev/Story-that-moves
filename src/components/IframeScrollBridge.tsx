import { useEffect, useRef } from 'react';

interface ScrollData {
  scrollPercent: number;
  scrollY: number;
  viewportHeight: number;
  documentHeight: number;
}

interface IframeScrollBridgeProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onScrollChange: (data: ScrollData) => void;
  isActive: boolean;
}

export default function IframeScrollBridge({ iframeRef, onScrollChange, isActive }: IframeScrollBridgeProps) {
  const injectedRef = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  const throttleMs = 50; // High-performance throttle for smooth pathfinding

  useEffect(() => {
    if (!isActive || !iframeRef.current) {
      injectedRef.current = false;
      return;
    }

    const iframe = iframeRef.current;

    const injectScrollTracker = () => {
      try {
        // Safety check: accessing contentDocument will throw if CORS is violated
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc || injectedRef.current) return;

        const script = iframeDoc.createElement('script');
        script.id = 'story-scroll-bridge';
        script.textContent = `
          (function() {
            let ticking = false;
            function sendUpdate() {
              const scrollY = window.scrollY || window.pageYOffset;
              const vh = window.innerHeight;
              const dh = document.documentElement.scrollHeight;
              const max = dh - vh;
              
              window.parent.postMessage({
                type: 'iframe-scroll',
                data: {
                  scrollPercent: max > 0 ? (scrollY / max) * 100 : 0,
                  scrollY: scrollY,
                  viewportHeight: vh,
                  documentHeight: dh
                }
              }, '*');
              ticking = false;
            }

            window.addEventListener('scroll', () => {
              if (!ticking) {
                window.requestAnimationFrame(sendUpdate);
                ticking = true;
              }
            }, { passive: true });
            
            // Initial ping
            sendUpdate();
          })();
        `;

        iframeDoc.head.appendChild(script);
        injectedRef.current = true;
      } catch (e) {
        // Fallback: If CORS blocks us, we rely on the parent wheel events
        console.warn('IframeBridge: Cross-origin access denied. Using fallback tracking.');
      }
    };

    const handleLoad = () => injectScrollTracker();

    // Check if already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      injectScrollTracker();
    } else {
      iframe.addEventListener('load', handleLoad);
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [iframeRef, isActive]);

  // Handle messages with throttling
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isActive || event.data?.type !== 'iframe-scroll') return;

      const now = Date.now();
      if (now - lastUpdateRef.current >= throttleMs) {
        onScrollChange(event.data.data);
        lastUpdateRef.current = now;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onScrollChange, isActive]);

  // Fallback: Listener for when users scroll on the Overlay (the "Stage")
  // This ensures motion still works even if iframe injection is blocked
  useEffect(() => {
    if (!isActive) return;

    const handleGlobalWheel = (e: WheelEvent) => {
      // If injection failed, we can still detect the 'intent' to scroll
      // and pass an estimated delta to the pathfinder
      if (!injectedRef.current) {
         // This can be expanded to update an 'estimated' scrollY
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [isActive]);

  return null;
}

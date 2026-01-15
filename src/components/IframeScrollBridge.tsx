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
  const throttleMs = 50; 

  useEffect(() => {
    if (!isActive || !iframeRef.current) {
      injectedRef.current = false;
      return;
    }

    const iframe = iframeRef.current;

    const injectScrollTracker = () => {
      try {
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
            
            sendUpdate();
          })();
        `;

        iframeDoc.head.appendChild(script);
        injectedRef.current = true;
      } catch (e) {
        console.warn('IframeBridge: Cross-origin access denied. Using fallback tracking.');
      }
    };

    const handleLoad = () => injectScrollTracker();

    if (iframe.contentDocument?.readyState === 'complete') {
      injectScrollTracker();
    } else {
      iframe.addEventListener('load', handleLoad);
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [iframeRef, isActive]);

  // --- SAFE MESSAGE HANDLER ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 1. Basic Filters
      if (!isActive || event.data?.type !== 'iframe-scroll') return;

      const now = Date.now();
      if (now - lastUpdateRef.current >= throttleMs) {
        
        /** * 🛡️ DEFENSIVE GUARD: 
         * This stops "e is not a function" crash.
         * We verify onScrollChange is actually a function before executing.
         */
        if (typeof onScrollChange === 'function') {
          onScrollChange(event.data.data);
        } else {
          // If we hit this, the parent is passing bad props
          console.error("IframeScrollBridge Error: 'onScrollChange' prop is not a function. Received:", onScrollChange);
        }

        lastUpdateRef.current = now;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onScrollChange, isActive]);

  // Global wheel fallback (optional intent detection)
  useEffect(() => {
    if (!isActive) return;

    const handleGlobalWheel = (e: WheelEvent) => {
      if (!injectedRef.current) {
         // Potential for estimated delta logic here
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleGlobalWheel);
  }, [isActive]);

  return null;
}

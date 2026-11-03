import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * Staggers children marked [data-reveal] into view when a page mounts.
 * Only animates transform/opacity and is skipped for prefers-reduced-motion.
 */
export function usePageMotion(selector = '[data-reveal]') {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(selector, {
          y: 12,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.out',
          stagger: 0.04,
          clearProps: 'transform,opacity',
        });
      });
      return () => mm.revert();
    },
    { scope }
  );

  return scope;
}

export default usePageMotion;

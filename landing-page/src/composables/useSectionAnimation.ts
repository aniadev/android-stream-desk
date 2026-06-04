import { onMounted, onUnmounted, type Ref } from 'vue';

interface SectionAnimationOptions {
  start?: string;
  stagger?: number;
  revealSelector?: string;
}

export function useSectionAnimation(
  scope: Readonly<Ref<HTMLElement | null>>,
  options: SectionAnimationOptions = {},
) {
  let cleanup: (() => void) | undefined;

  onMounted(async () => {
    const scopeElement = scope.value;

    if (!scopeElement || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);

    gsap.registerPlugin(ScrollTrigger);

    const revealSelector = options.revealSelector ?? '[data-reveal]';
    const revealTargets = scopeElement.querySelectorAll(revealSelector);
    const floatTargets = scopeElement.querySelectorAll('[data-float]');
    const glowTargets = scopeElement.querySelectorAll('[data-glow]');

    const context = gsap.context(() => {
      if (revealTargets.length > 0) {
        gsap.from(revealTargets, {
          autoAlpha: 0,
          y: 34,
          scale: 0.97,
          rotateX: -5,
          duration: 0.82,
          ease: 'power3.out',
          stagger: options.stagger ?? 0.08,
          scrollTrigger: {
            trigger: scopeElement,
            start: options.start ?? 'top 76%',
            once: true,
          },
        });
      }

      if (floatTargets.length > 0) {
        gsap.to(floatTargets, {
          y: -8,
          duration: 2.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.16,
        });
      }

      if (glowTargets.length > 0) {
        gsap.to(glowTargets, {
          xPercent: 12,
          yPercent: -8,
          duration: 3.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.18,
        });
      }
    }, scopeElement);

    cleanup = () => context.revert();
  });

  onUnmounted(() => {
    cleanup?.();
  });
}

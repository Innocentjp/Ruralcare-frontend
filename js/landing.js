document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  const AUTH_URL = 'auth.html';

  const navigateAuth = (target) => {
    try {
      sessionStorage.setItem('ruralcare_next', target);
    } catch(e) {}
    window.location.href = `${AUTH_URL}?next=${encodeURIComponent(target)}`;
  };

  document.querySelectorAll('[data-auth]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateAuth(el.getAttribute('data-auth'));
    });
  });

  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  const sysInput = document.getElementById('sim-sys');
  const diaInput = document.getElementById('sim-dia');
  const tempInput = document.getElementById('sim-temp');
  const spo2Input = document.getElementById('sim-spo2');
  const badgeEl = document.getElementById('triage-badge');
  const flagsList = document.getElementById('triage-flags');

  const assess = () => {
    if (!sysInput || !diaInput || !tempInput || !spo2Input || !badgeEl || !flagsList) return;

    const systolic = parseInt(sysInput.value, 10);
    const diastolic = parseInt(diaInput.value, 10);
    const temperature = parseFloat(tempInput.value);
    const oxygen = parseInt(spo2Input.value, 10);

    let level = 'NORMAL';
    let label = 'Normal Baseline';
    const flags = [];

    if (oxygen && oxygen < 92) {
      level = 'CRITICAL';
      label = 'Critical Urgency';
      flags.push('SpO2 below 92% (Severe Hypoxia Risk)');
    } else if (oxygen && oxygen < 95) {
      if (level !== 'CRITICAL') { level = 'REVIEW'; label = 'Needs Review'; }
      flags.push('SpO2 borderline (92-94%)');
    }

    if (systolic && diastolic) {
      if (systolic >= 160 || diastolic >= 100) {
        level = 'CRITICAL';
        label = 'Critical Urgency';
        flags.push('Blood pressure in Hypertensive Crisis range (≥ 160/100 mmHg)');
      } else if (systolic >= 140 || diastolic >= 90) {
        if (level !== 'CRITICAL') { level = 'REVIEW'; label = 'Needs Review'; }
        flags.push('Stage 2 Hypertension range (≥ 140/90 mmHg)');
      }
    }

    if (temperature && temperature >= 39.0) {
      level = 'CRITICAL';
      label = 'Critical Urgency';
      flags.push('High-grade fever (≥ 39.0 °C)');
    } else if (temperature && temperature >= 38.0) {
      if (level !== 'CRITICAL') { level = 'REVIEW'; label = 'Needs Review'; }
      flags.push('Febrile reading recorded (≥ 38.0 °C)');
    }

    if (flags.length === 0) {
      flags.push('Readings are within stable baseline limits');
    }

    badgeEl.textContent = label;
    if (level === 'CRITICAL') {
      badgeEl.className = 'px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-red-50 text-red-700 border border-red-200';
    } else if (level === 'REVIEW') {
      badgeEl.className = 'px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-amber-50 text-amber-800 border border-amber-200';
    } else {
      badgeEl.className = 'px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-emerald-50 text-greenMedical border border-emerald-200';
    }

    flagsList.innerHTML = flags.map(f => `
      <li class="flex items-start gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-greenMedical mt-1.5 shrink-0"></span>
        <span>${f}</span>
      </li>
    `).join('');
  };

  [sysInput, diaInput, tempInput, spo2Input].forEach(inp => {
    if (inp) inp.addEventListener('input', assess);
  });

  assess();

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.from('#hero-text > *', {
      y: 35,
      opacity: 0,
      duration: 0.9,
      stagger: 0.15,
      ease: 'power3.out'
    });

    gsap.to('#hero-bg', {
      yPercent: 18,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero-section',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    gsap.utils.toArray('.anim-card').forEach(card => {
      gsap.fromTo(card,
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            end: 'bottom 12%',
            toggleActions: 'play reverse play reverse'
          }
        }
      );
    });

    gsap.utils.toArray('.anim-heading').forEach(heading => {
      gsap.fromTo(heading,
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: heading,
            start: 'top 90%',
            end: 'bottom 10%',
            toggleActions: 'play reverse play reverse'
          }
        }
      );
    });
  }
});
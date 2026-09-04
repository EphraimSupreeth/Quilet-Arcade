/* Theme-specific welcome hero */

:root,
body.theme-system {
  --hero-start: #4aa4ef;
  --hero-middle: #378ed7;
  --hero-end: #267fc9;
  --hero-button-text: #246fae;
  --hero-shadow: rgba(20, 88, 142, 0.3);
  --hero-circle: rgba(255, 255, 255, 0.18);
  --hero-circle-soft: rgba(255, 255, 255, 0.1);
}

body.theme-ocean {
  --hero-start: #0b81b7;
  --hero-middle: #0b81b7;
  --hero-end: #086f9f;
  --hero-button-text: #08658f;
  --hero-shadow: rgba(4, 76, 109, 0.3);

  /* Match controls throughout the Ocean theme */
  --accent: #0b81b7;
  --accent-hover: #086f9f;
  --accent-dark: #075f89;
  --accent-soft: rgba(11, 129, 183, 0.12);
  --primary: #0b81b7;
  --primary-dark: #086f9f;
}

body.theme-sunset {
  --hero-start: #f08a3e;
  --hero-middle: #d3494c;
  --hero-end: #d63384;
  --hero-button-text: #c63f43;
  --hero-shadow: rgba(130, 42, 45, 0.3);
}

body.theme-rainbow {
  --hero-start: #d946a8;
  --hero-middle: #a33fad;
  --hero-end: #7540c7;
  --hero-button-text: #8d3798;
  --hero-shadow: rgba(92, 35, 105, 0.3);
}

body.theme-candy {
  --hero-start: #af38a7;
  --hero-middle: #d83d9c;
  --hero-end: #ec5caa;
  --hero-button-text: #9f3198;
  --hero-shadow: rgba(103, 30, 97, 0.3);
}

body.theme-forest {
  --hero-start: #0c8c79;
  --hero-middle: #087a70;
  --hero-end: #075f62;
  --hero-button-text: #087568;
  --hero-shadow: rgba(3, 75, 67, 0.3);
}

body.theme-galaxy {
  --hero-start: #57378d;
  --hero-middle: #8352bd;
  --hero-end: #b67cf0;
  --hero-button-text: #7545ad;
  --hero-shadow: rgba(49, 27, 83, 0.34);
  --hero-circle: rgba(255, 255, 255, 0.2);
  --hero-circle-soft: rgba(255, 255, 255, 0.11);
}

body.theme-night,
body.system-dark-active {
  --hero-start: #4aa4ef;
  --hero-middle: #286fae;
  --hero-end: #194f82;
  --hero-button-text: #246da9;
  --hero-shadow: rgba(3, 27, 48, 0.42);
  --hero-circle: rgba(255, 255, 255, 0.17);
  --hero-circle-soft: rgba(255, 255, 255, 0.09);
}

body.theme-kids {
  --hero-start: #af38a7;
  --hero-middle: #d83d9c;
  --hero-end: #f064b0;
  --hero-button-text: #9f3198;
  --hero-shadow: rgba(103, 30, 97, 0.28);
  --hero-circle: rgba(255, 255, 255, 0.21);
  --hero-circle-soft: rgba(255, 255, 255, 0.12);
}

/* Keep native controls consistent with the active theme */
body {
  accent-color: var(--accent);
}

::selection {
  background: var(--accent);
  color: #ffffff;
}

/* Welcome hero */
.hero-card {
  background:
    radial-gradient(
      circle at 88% 18%,
      var(--hero-circle) 0 8%,
      transparent 8.5%
    ),
    radial-gradient(
      circle at 78% 88%,
      var(--hero-circle-soft) 0 13%,
      transparent 13.5%
    ),
    linear-gradient(
      135deg,
      var(--hero-start) 0%,
      var(--hero-middle) 52%,
      var(--hero-end) 100%
    ) !important;
  border-color: transparent !important;
  color: #ffffff !important;
  box-shadow: 0 18px 45px var(--hero-shadow) !important;
}

/* Keep all hero content readable */
.hero-card h1,
.hero-card h2,
.hero-card h3,
.hero-card strong,
.hero-card .eyebrow,
.hero-card .hero-copy {
  color: #ffffff !important;
}

.hero-card .eyebrow {
  opacity: 0.9;
}

.hero-card .hero-copy {
  opacity: 0.95;
}

.hero-card .hero-tag {
  border-color: rgba(255, 255, 255, 0.42) !important;
  background: rgba(255, 255, 255, 0.16) !important;
  color: #ffffff !important;
  backdrop-filter: blur(6px);
}

/* Theme-matched decorative circles */
.hero-card::before {
  background:
    radial-gradient(
      circle at 94% 12%,
      var(--hero-circle) 0 54px,
      transparent 55px
    ),
    radial-gradient(
      circle at 65% 110%,
      var(--hero-circle-soft) 0 92px,
      transparent 93px
    ) !important;
  pointer-events: none;
}

.hero-card::after {
  right: -58px;
  bottom: -86px;
  width: 260px;
  height: 260px;
  border-color: var(--hero-circle) !important;
  pointer-events: none;
}

/* Quilet Arcade logo */
.hero-art {
  position: relative;
}

.hero-art::before,
.hero-art::after {
  position: absolute;
  border-radius: 50%;
  content: "";
  pointer-events: none;
}

.hero-art::before {
  width: 165px;
  height: 165px;
  border: 2px solid var(--hero-circle);
}

.hero-art::after {
  width: 125px;
  height: 125px;
  background: var(--hero-circle-soft);
}

.hero-animation {
  position: relative;
  z-index: 2;
  width: clamp(125px, 14vw, 190px);
  height: clamp(125px, 14vw, 190px);
  color: transparent;
  font-size: 0;
  background-image: url("https://uploads.onecompiler.io/44t258rvg/44x5y9pza/Website%20logo.png");
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  filter: drop-shadow(0 18px 22px var(--hero-shadow));
}

/* Hero buttons follow the selected theme */
.hero-card .primary-btn {
  border-color: #ffffff !important;
  background: #ffffff !important;
  color: var(--hero-button-text) !important;
  box-shadow: 0 10px 24px var(--hero-shadow) !important;
}

.hero-card .secondary-btn {
  border-color: rgba(255, 255, 255, 0.58) !important;
  background: rgba(255, 255, 255, 0.14) !important;
  color: #ffffff !important;
  box-shadow: none !important;
  backdrop-filter: blur(6px);
}

.hero-card .primary-btn:hover:not(:disabled) {
  border-color: #ffffff !important;
  background: rgba(255, 255, 255, 0.92) !important;
  color: var(--hero-button-text) !important;
  box-shadow: 0 12px 26px var(--hero-shadow) !important;
}

.hero-card .secondary-btn:hover:not(:disabled) {
  border-color: #ffffff !important;
  background: rgba(255, 255, 255, 0.24) !important;
  color: #ffffff !important;
  box-shadow: 0 12px 26px var(--hero-shadow) !important;
}

/* Ocean theme controls */
body.theme-ocean .primary-btn:not(.hero-card .primary-btn) {
  border-color: #0b81b7 !important;
  background: #0b81b7 !important;
  color: #ffffff !important;
  box-shadow: 0 8px 20px rgba(11, 129, 183, 0.22) !important;
}

body.theme-ocean .primary-btn:not(.hero-card .primary-btn):hover:not(:disabled) {
  border-color: #086f9f !important;
  background: #086f9f !important;
  color: #ffffff !important;
  box-shadow: 0 10px 24px rgba(11, 129, 183, 0.3) !important;
}

body.theme-ocean .secondary-btn:not(.hero-card .secondary-btn),
body.theme-ocean .text-btn,
body.theme-ocean .tiny-btn:not(.danger) {
  border-color: rgba(11, 129, 183, 0.35) !important;
  background: rgba(11, 129, 183, 0.1) !important;
  color: #086f9f !important;
}

body.theme-ocean .secondary-btn:not(.hero-card .secondary-btn):hover:not(:disabled),
body.theme-ocean .text-btn:hover:not(:disabled),
body.theme-ocean .tiny-btn:not(.danger):hover:not(:disabled) {
  border-color: #0b81b7 !important;
  background: rgba(11, 129, 183, 0.18) !important;
  color: #075f89 !important;
}

body.theme-ocean .nav-btn.active,
body.theme-ocean .nav-btn:hover,
body.theme-ocean .icon-btn:hover:not(:disabled) {
  border-color: rgba(11, 129, 183, 0.35) !important;
  background: rgba(11, 129, 183, 0.12) !important;
  color: #086f9f !important;
}

body.theme-ocean a,
body.theme-ocean .eyebrow {
  color: #0b81b7;
}

body.theme-ocean input:focus,
body.theme-ocean select:focus,
body.theme-ocean textarea:focus {
  border-color: #0b81b7 !important;
  box-shadow: 0 0 0 3px rgba(11, 129, 183, 0.14) !important;
}

@media (max-width: 680px) {
  .hero-art::before,
  .hero-art::after {
    display: none;
  }
}

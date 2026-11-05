/**
 * COM481 Human-Computer Interaction — Shared Navigation & Theme Engine (nav.js)
 * 
 * Provides:
 *  1. Full-Site Dark Mode & Light Mode system:
 *     - Togglable directly from the left navigation bar.
 *     - Keyboard shortcut: Press 'T' (or 't') anywhere to toggle theme.
 *     - Smooth CSS transitions across all note sheets, highlighters, cards, tables, SVGs.
 *     - State persistence in localStorage (hci_theme = 'dark' | 'light').
 *     - Zero Flash-of-Unstyled-Content (FOUC).
 *     - Non-intrusive floating HUD toast when toggled via keyboard.
 *  2. Left sidebar that closes all the way on desktop (translateX -100%, 0 body padding)
 *     with smooth CSS transitions and state memory (localStorage).
 *  3. Desktop floating open trigger (top-left) with keyboard shortcut (Ctrl+B or [).
 *  4. Mobile 3-dots kebab menu trigger on top-right that toggles the off-canvas drawer.
 *  5. In-page Table of Contents (TOC) auto-extracted for the active week.
 *  6. Real-time IntersectionObserver scroll-spy for active section highlighting.
 *  7. 5-color highlighter legend quick-reference.
 */

(function () {
  'use strict';

  // Apply saved theme immediately to prevent any flash of white (FOUC)
  const savedTheme = localStorage.getItem('hci_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  let isDarkMode = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Prevent multiple injections
  if (document.getElementById('hci-nav-root')) return;

  const WEEKS = [
    { num: 'W1', title: 'Week 1: Intro to HCI & History', file: 'hci_week_1_study_notes.html', slides: '13 Slides' },
    { num: 'W2', title: 'Week 2: The Human (Perception & Memory)', file: 'hci_week_2_study_notes.html', slides: '60 Slides' },
    { num: 'W3', title: 'Week 3: The Computer (I/O & Time)', file: 'hci_week_3_study_notes.html', slides: '94 Slides' },
    { num: 'W4', title: 'Week 4: Next-Gen & Disappearing Screen', file: 'hci_week_4_study_notes.html', slides: '32 Slides' },
    { num: 'W5', title: 'Week 5: Interaction Principles & Heuristics', file: 'hci_week_5_study_notes.html', slides: '49 Slides' },
    { num: 'W6', title: 'Week 6: UCD, Requirements & Personas', file: 'hci_week_6_study_notes.html', slides: '49 Slides' },
    { num: 'W7', title: 'Week 7: Prototyping & Wireframing', file: '#', slides: 'Upcoming', planned: true },
    { num: 'W8', title: 'Week 8: Midterm Examination Prep', file: '#', slides: 'Review Hub', planned: true },
    { num: 'W9', title: 'Week 9: High-Fi Prototypes & Design Systems', file: '#', slides: 'Upcoming', planned: true },
    { num: 'W10', title: 'Week 10: Heuristic Evaluation & Walkthroughs', file: '#', slides: 'Upcoming', planned: true },
    { num: 'W11', title: 'Week 11: Usability Testing & Metrics (SUS)', file: '#', slides: 'Upcoming', planned: true },
    { num: 'W12', title: 'Week 12: Universal Design & Accessibility (WCAG)', file: '#', slides: 'Upcoming', planned: true },
    { num: 'W13', title: 'Week 13: Emerging Interfaces & Spatial AI', file: '#', slides: 'Upcoming', planned: true },
    { num: 'W14', title: 'Week 14: Final Projects & Case Studies', file: '#', slides: 'Presentations', planned: true }
  ];

  // Helper to detect current page robustly
  function getCurrentPage() {
    let cleanPath = window.location.pathname.toLowerCase();
    cleanPath = cleanPath.split('?')[0].split('#')[0];
    const parts = cleanPath.split('/').filter(Boolean);
    const last = parts.length > 0 ? parts[parts.length - 1] : '';
    if (!last || !last.includes('.html')) {
      return 'index.html';
    }
    return last;
  }

  const currentPage = getCurrentPage();
  // Persistent state: whether desktop sidebar is closed all the way
  let isClosed = localStorage.getItem('hci_nav_closed') === 'true';

  // Inject Nav & Dark Mode Styles
  const styleEl = document.createElement('style');
  styleEl.id = 'hci-nav-styles';
  styleEl.textContent = `
    :root {
      --hci-sidebar-width: 280px;
      --hci-paper: #FAF8F5;
      --hci-border: #E4E2DD;
      --hci-ink: #18181B;
      --hci-amber: #F59E0B;
    }

    body {
      transition: padding-left 0.28s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, color 0.2s ease !important;
    }

    /* Desktop Layout Shifting: Open (padding-left 280px) vs Closed All The Way (padding-left 0) */
    @media (min-width: 1024px) {
      body.hci-sidebar-open {
        padding-left: var(--hci-sidebar-width) !important;
      }
      body.hci-sidebar-closed {
        padding-left: 0 !important;
      }
      body.hci-sidebar-closed header.sticky {
        padding-left: 92px !important;
        transition: padding-left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      }
      body.hci-sidebar-open header.sticky {
        padding-left: 0 !important;
        transition: padding-left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      }
    }

    /* Fixed Left Sidebar Container */
    #hci-sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 60;
      width: var(--hci-sidebar-width);
      background-color: #FAF8F5;
      border-right: 1px solid var(--hci-border);
      box-shadow: 4px 0 24px -4px rgba(24, 24, 27, 0.08);
      display: flex;
      flex-direction: column;
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.2s ease;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    /* Mobile drawer states (< 1024px) */
    @media (max-width: 1023px) {
      #hci-sidebar {
        width: min(320px, 86vw) !important;
        transform: translateX(-100%);
      }
      #hci-sidebar.mobile-open {
        transform: translateX(0);
      }
    }

    /* Desktop states (>= 1024px): Open (0) vs Closed All The Way (-100%) */
    @media (min-width: 1024px) {
      #hci-sidebar.desktop-open {
        transform: translateX(0);
      }
      #hci-sidebar.desktop-closed {
        transform: translateX(-100%);
      }
    }

    /* Desktop Re-Open Trigger (Top-Left) */
    #hci-desktop-trigger {
      position: fixed;
      top: 10px;
      left: 14px;
      z-index: 55;
      background-color: #FAF8F5;
      color: #18181B;
      border: 1px solid #D4D0C8;
      border-radius: 8px;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
      cursor: pointer;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      transition: opacity 0.22s ease, transform 0.22s ease, background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    #hci-desktop-trigger:hover {
      background-color: #F0EDE6;
      border-color: #18181B;
    }
    #hci-desktop-trigger:active {
      transform: scale(0.97);
    }
    @media (max-width: 1023px) {
      #hci-desktop-trigger {
        display: none !important;
      }
    }
    @media (min-width: 1024px) {
      body.hci-sidebar-open #hci-desktop-trigger {
        opacity: 0;
        pointer-events: none;
        transform: translateX(-20px);
      }
      body.hci-sidebar-closed #hci-desktop-trigger {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0);
      }
    }

    /* Mobile 3-Dots Menu Trigger (Top-Right) */
    #hci-mobile-trigger {
      position: fixed;
      top: 10px;
      right: 12px;
      z-index: 70;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background-color: #FAF8F5;
      color: #18181B;
      border: 1px solid #D4D0C8;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      -webkit-tap-highlight-color: transparent;
    }
    #hci-mobile-trigger:hover {
      background-color: #F0EDE6;
      border-color: #18181B;
    }
    #hci-mobile-trigger:active {
      transform: scale(0.94);
    }
    #hci-mobile-trigger.hci-mobile-trigger-active {
      background-color: #18181B;
      color: #FDE047;
      border-color: #18181B;
      box-shadow: 0 4px 16px rgba(24, 24, 27, 0.3);
    }
    @media (min-width: 1024px) {
      #hci-mobile-trigger {
        display: none !important;
      }
    }
    @media (max-width: 1023px) {
      header.sticky {
        padding-right: 56px !important;
      }
    }

    /* Blurred Backdrop for Mobile */
    #hci-backdrop {
      position: fixed;
      inset: 0;
      z-index: 59;
      background-color: rgba(24, 24, 27, 0.45);
      backdrop-filter: blur(3px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    #hci-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    /* Scroll Area Styling */
    .hci-scroll-area::-webkit-scrollbar {
      width: 4px;
    }
    .hci-scroll-area::-webkit-scrollbar-track {
      background: transparent;
    }
    .hci-scroll-area::-webkit-scrollbar-thumb {
      background: #D4D0C8;
      border-radius: 4px;
    }
    .hci-scroll-area::-webkit-scrollbar-thumb:hover {
      background: #A1A1AA;
    }

    /* Nav Items */
    .hci-nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: 8px;
      font-size: 12.5px;
      color: #3F3F46;
      text-decoration: none;
      transition: all 0.15s ease;
      font-weight: 500;
    }
    .hci-nav-item:hover {
      background-color: #F0EDE6;
      color: #18181B;
    }
    .hci-nav-item.active {
      background-color: #18181B;
      color: #FDE047;
      font-weight: 700;
      box-shadow: 0 2px 8px -1px rgba(24, 24, 27, 0.2);
    }
    .hci-nav-item.active .hci-badge {
      background-color: #FDE047;
      color: #18181B;
    }

    /* In-Page TOC Jump Links */
    .hci-toc-link {
      display: block;
      padding: 4px 8px 4px 20px;
      font-size: 11px;
      color: #71717A;
      text-decoration: none;
      border-left: 2px solid transparent;
      transition: all 0.15s ease;
      line-height: 1.35;
      font-family: 'JetBrains Mono', monospace;
      border-radius: 0 4px 4px 0;
    }
    .hci-toc-link:hover {
      color: #18181B;
      border-left-color: #A1A1AA;
      background-color: rgba(240, 237, 230, 0.6);
    }
    .hci-toc-link.toc-active {
      color: #0F172A;
      font-weight: 700;
      border-left-color: #F59E0B;
      background-color: rgba(254, 240, 138, 0.4);
    }

    /* =========================================================================
       COMPLETE DARK MODE SYSTEM (html.dark)
       ========================================================================= */
    html.dark, html.dark body {
      background-color: #121215 !important;
      color: #E4E4E7 !important;
      background-image: 
        radial-gradient(#26262B 1.15px, transparent 1.15px),
        linear-gradient(to right, rgba(38, 38, 43, 0.4) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(38, 38, 43, 0.4) 1px, transparent 1px) !important;
      background-size: 24px 24px, 96px 96px, 96px 96px !important;
    }

    /* Note Sheets in Dark Mode */
    html.dark .note-sheet {
      background-color: #18181C !important;
      border-color: #2A2A30 !important;
      color: #E4E4E7 !important;
      box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.55), 0 2px 6px -1px rgba(0, 0, 0, 0.3) !important;
    }
    html.dark .border-t-zinc-900 {
      border-top-color: #F59E0B !important;
    }

    /* Sticky Header & Footers */
    html.dark header.sticky {
      background-color: rgba(18, 18, 21, 0.94) !important;
      border-color: #2A2A32 !important;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45) !important;
    }
    html.dark footer {
      background-color: #141417 !important;
      border-color: #26262C !important;
      color: #A1A1AA !important;
    }

    /* Sticky Post-It Callouts */
    html.dark .sticky-callout {
      background-color: #272210 !important;
      border-color: #634E0B !important;
      box-shadow: 2px 4px 16px rgba(0, 0, 0, 0.45) !important;
    }
    html.dark .sticky-callout .font-hand,
    html.dark .sticky-callout .text-amber-900 {
      color: #FEF08A !important;
    }

    /* General Backgrounds */
    html.dark .bg-white {
      background-color: #18181C !important;
    }
    html.dark .bg-zinc-50 {
      background-color: #141417 !important;
    }
    html.dark .bg-zinc-100 {
      background-color: #1F1F24 !important;
    }
    html.dark .bg-zinc-200 {
      background-color: #2A2A32 !important;
    }
    html.dark .bg-\[\#FAF8F5\],
    html.dark .bg-\[\#FDFBF7\],
    html.dark .bg-\[\#FBF9F5\] {
      background-color: #151518 !important;
    }

    /* Text Colors */
    html.dark .text-zinc-900 {
      color: #F4F4F5 !important;
    }
    html.dark .text-zinc-800 {
      color: #E4E4E7 !important;
    }
    html.dark .text-zinc-700 {
      color: #D4D4D8 !important;
    }
    html.dark .text-zinc-600 {
      color: #A1A1AA !important;
    }
    html.dark .text-zinc-500 {
      color: #8A8A93 !important;
    }
    html.dark .text-zinc-400 {
      color: #71717A !important;
    }

    /* Borders */
    html.dark .border-zinc-200,
    html.dark .border-zinc-300,
    html.dark .border-\[\#E4E2DD\] {
      border-color: #2A2A32 !important;
    }

    /* Semantic Tinted Boxes in Dark Mode */
    /* Emerald / Green */
    html.dark .bg-emerald-50,
    html.dark .bg-emerald-50\/60 {
      background-color: rgba(6, 78, 59, 0.28) !important;
    }
    html.dark .border-emerald-200,
    html.dark .border-emerald-300 {
      border-color: rgba(16, 185, 129, 0.35) !important;
    }
    html.dark .text-emerald-800,
    html.dark .text-emerald-900 {
      color: #6EE7B7 !important;
    }

    /* Sky / Blue */
    html.dark .bg-sky-50,
    html.dark .bg-sky-50\/60,
    html.dark .bg-sky-50\/70 {
      background-color: rgba(12, 74, 110, 0.28) !important;
    }
    html.dark .border-sky-200,
    html.dark .border-sky-300 {
      border-color: rgba(14, 165, 233, 0.35) !important;
    }
    html.dark .text-sky-800,
    html.dark .text-sky-900 {
      color: #7DD3FC !important;
    }

    /* Rose / Red */
    html.dark .bg-rose-50,
    html.dark .bg-rose-50\/60,
    html.dark .bg-rose-50\/70 {
      background-color: rgba(136, 19, 55, 0.28) !important;
    }
    html.dark .border-rose-200,
    html.dark .border-rose-300 {
      border-color: rgba(244, 63, 94, 0.35) !important;
    }
    html.dark .text-rose-800,
    html.dark .text-rose-900 {
      color: #FDA4AF !important;
    }

    /* Amber / Yellow */
    html.dark .bg-amber-50,
    html.dark .bg-amber-50\/70,
    html.dark .bg-amber-100 {
      background-color: rgba(120, 53, 15, 0.28) !important;
    }
    html.dark .border-amber-200,
    html.dark .border-amber-300 {
      border-color: rgba(245, 158, 11, 0.35) !important;
    }
    html.dark .text-amber-800,
    html.dark .text-amber-900 {
      color: #FCD34D !important;
    }

    /* Purple */
    html.dark .bg-purple-50 {
      background-color: rgba(88, 28, 135, 0.28) !important;
    }
    html.dark .border-purple-200 {
      border-color: rgba(168, 85, 247, 0.35) !important;
    }
    html.dark .text-purple-800,
    html.dark .text-purple-900 {
      color: #D8B4FE !important;
    }

    /* Indigo */
    html.dark .bg-indigo-50 {
      background-color: rgba(49, 46, 129, 0.28) !important;
    }
    html.dark .border-indigo-200 {
      border-color: rgba(99, 102, 241, 0.35) !important;
    }
    html.dark .text-indigo-800,
    html.dark .text-indigo-900 {
      color: #A5B4FC !important;
    }

    /* Highlighters in Dark Mode */
    html.dark .hl-yellow {
      background: rgba(234, 179, 8, 0.24) !important;
      color: #FEF08A !important;
      box-shadow: inset 0 0 0 1px rgba(234, 179, 8, 0.35) !important;
    }
    html.dark .hl-green {
      background: rgba(34, 197, 94, 0.22) !important;
      color: #BBF7D0 !important;
      box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.35) !important;
    }
    html.dark .hl-blue {
      background: rgba(56, 189, 248, 0.22) !important;
      color: #BAE6FD !important;
      box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.35) !important;
    }
    html.dark .hl-pink {
      background: rgba(244, 63, 94, 0.22) !important;
      color: #FECDD3 !important;
      box-shadow: inset 0 0 0 1px rgba(244, 63, 94, 0.35) !important;
    }
    html.dark .hl-purple {
      background: rgba(168, 85, 247, 0.22) !important;
      color: #E9D5FF !important;
      box-shadow: inset 0 0 0 1px rgba(168, 85, 247, 0.35) !important;
    }

    /* Tables in Dark Mode */
    html.dark table thead th {
      background-color: #1F1F25 !important;
      color: #F4F4F5 !important;
      border-color: #2A2A32 !important;
    }
    html.dark table tbody td {
      border-color: #25252D !important;
    }
    html.dark table tbody tr:nth-child(even) td {
      background-color: rgba(255, 255, 255, 0.02) !important;
    }

    /* Inputs (Search Bar) */
    html.dark input[type="text"],
    html.dark input[type="search"] {
      background-color: #18181C !important;
      color: #F4F4F5 !important;
      border-color: #3F3F46 !important;
    }
    html.dark input::placeholder {
      color: #71717A !important;
    }

    /* Sidebar in Dark Mode */
    html.dark #hci-sidebar {
      background-color: #151518 !important;
      border-color: #26262C !important;
      box-shadow: 4px 0 24px -4px rgba(0, 0, 0, 0.6) !important;
    }
    html.dark #hci-sidebar .border-b,
    html.dark #hci-sidebar .border-t {
      border-color: #24242A !important;
    }
    html.dark #hci-sidebar .bg-\[\#FAF8F5\] {
      background-color: #151518 !important;
    }
    html.dark .hci-nav-item {
      color: #A1A1AA !important;
    }
    html.dark .hci-nav-item:hover {
      background-color: #1F1F26 !important;
      color: #F4F4F5 !important;
    }
    html.dark .hci-nav-item.active {
      background-color: #272730 !important;
      color: #FDE047 !important;
    }
    html.dark .hci-nav-item:not(.active) .hci-badge {
      background-color: #24242B !important;
      color: #D4D4D8 !important;
    }
    html.dark .hci-toc-link {
      color: #71717A !important;
    }
    html.dark .hci-toc-link:hover {
      color: #F4F4F5 !important;
      background-color: rgba(255, 255, 255, 0.04) !important;
      border-left-color: #A1A1AA !important;
    }
    html.dark .hci-toc-link.toc-active {
      color: #FDE047 !important;
      background-color: rgba(245, 158, 11, 0.14) !important;
      border-left-color: #F59E0B !important;
    }
    html.dark #hci-desktop-trigger {
      background-color: #18181C !important;
      color: #F4F4F5 !important;
      border-color: #3F3F46 !important;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35) !important;
    }
    html.dark #hci-desktop-trigger:hover {
      background-color: #222228 !important;
      border-color: #F59E0B !important;
    }
    html.dark #hci-mobile-trigger {
      background-color: #18181C !important;
      color: #F4F4F5 !important;
      border-color: #3F3F46 !important;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45) !important;
    }
    html.dark #hci-mobile-trigger.hci-mobile-trigger-active {
      background-color: #F59E0B !important;
      color: #18181B !important;
      border-color: #F59E0B !important;
    }

    /* SVG Adaptations in Dark Mode */
    html.dark svg rect[fill="#FFFFFF"],
    html.dark svg rect[fill="white"],
    html.dark svg rect[fill="#FAF8F5"],
    html.dark svg rect[fill="#F6F4F0"] {
      fill: #1A1A20 !important;
    }
    html.dark svg text[fill="#18181B"],
    html.dark svg text[fill="#27272A"],
    html.dark svg text[fill="#0F172A"],
    html.dark svg text[fill="#3F3F46"] {
      fill: #F4F4F5 !important;
    }
    html.dark svg text[fill="#52525B"],
    html.dark svg text[fill="#71717A"] {
      fill: #A1A1AA !important;
    }
    html.dark svg [stroke="#18181B"],
    html.dark svg [stroke="#27272A"],
    html.dark svg [stroke="#3F3F46"] {
      stroke: #71717A !important;
    }
    html.dark svg [stroke="#E4E2DD"],
    html.dark svg [stroke="#D4D0C8"] {
      stroke: #2E2E36 !important;
    }
  `;
  document.head.appendChild(styleEl);

  // Build Root Container
  const navRoot = document.createElement('div');
  navRoot.id = 'hci-nav-root';

  // 1. Mobile Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'hci-backdrop';
  navRoot.appendChild(backdrop);

  // 2. Desktop Trigger Button (Top-Left)
  const desktopTrigger = document.createElement('button');
  desktopTrigger.id = 'hci-desktop-trigger';
  desktopTrigger.setAttribute('aria-label', 'Open Course Navigation');
  desktopTrigger.setAttribute('title', 'Open Course Navigation (Ctrl+B)');
  desktopTrigger.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <polyline points="13 10 15 12 13 14"></polyline>
    </svg>
    <span class="font-mono text-xs font-bold tracking-wide">MENU</span>
  `;
  navRoot.appendChild(desktopTrigger);

  // 3. Mobile 3-Dots Menu Trigger (Top-Right)
  const mobileTrigger = document.createElement('button');
  mobileTrigger.id = 'hci-mobile-trigger';
  mobileTrigger.setAttribute('aria-label', 'Toggle Navigation Menu');
  mobileTrigger.setAttribute('title', 'Toggle Navigation Menu');
  mobileTrigger.innerHTML = `
    <!-- 3-Dots Kebab Icon (Default) -->
    <svg id="hci-dots-icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2.2"></circle>
      <circle cx="12" cy="12" r="2.2"></circle>
      <circle cx="12" cy="19" r="2.2"></circle>
    </svg>
    <!-- Close Icon (When Open) -->
    <svg id="hci-mobile-close-icon" style="display:none;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  navRoot.appendChild(mobileTrigger);

  // 4. Sidebar Container
  const sidebar = document.createElement('aside');
  sidebar.id = 'hci-sidebar';

  // A. Header with Close Button
  const headerHtml = `
    <div class="p-3 border-b border-[#E4E2DD] flex items-center justify-between gap-2 shrink-0 bg-[#FAF8F5]">
      <a href="index.html" class="flex items-center gap-2.5 text-zinc-900 no-underline overflow-hidden">
        <span class="w-8 h-8 rounded-lg bg-zinc-900 text-amber-300 font-mono text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm">
          HCI
        </span>
        <div class="leading-tight min-w-0">
          <div class="font-extrabold text-sm tracking-tight text-zinc-900 truncate">COM481 • Notes</div>
          <div class="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">IAU Engineering</div>
        </div>
      </a>
      <button id="hci-close-btn" class="w-8 h-8 rounded-lg hover:bg-zinc-200/80 text-zinc-600 flex items-center justify-center transition shrink-0" title="Close Navigation">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `;

  // B. Navigation Items List
  let navItemsHtml = `
    <div class="hci-scroll-area flex-1 overflow-y-auto px-2 py-3 space-y-3.5">
      <!-- Portal Link -->
      <div>
        <a href="index.html" class="hci-nav-item ${currentPage === 'index.html' || currentPage === '' ? 'active' : ''}" title="Course Portal Hub">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span class="truncate font-semibold">Course Portal Hub</span>
        </a>
      </div>

      <!-- Weekly Modules List -->
      <div>
        <div class="px-2 mb-1.5 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          <span>Weekly Modules</span>
          <span>Semester Arc</span>
        </div>
        <div class="space-y-0.5" id="hci-weeks-list">
  `;

  WEEKS.forEach((w) => {
    const isCurrent = currentPage.toLowerCase() === w.file.toLowerCase();

    navItemsHtml += `
      <div class="hci-week-group">
        <a href="${w.file}" class="hci-nav-item ${isCurrent ? 'active' : ''} ${w.planned ? 'opacity-60 cursor-not-allowed' : ''}" title="${w.title}" ${w.planned ? 'onclick="event.preventDefault(); alert(\'Week ' + w.num + ' module is planned for release in the second half of the semester!\')"' : ''}>
          <span class="hci-badge w-6 h-6 rounded font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${isCurrent ? 'bg-amber-300 text-zinc-900' : 'bg-zinc-200 text-zinc-700'}">
            ${w.num}
          </span>
          <span class="truncate flex-1">${w.title}</span>
          ${w.planned ? '<span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-400">Soon</span>' : ''}
        </a>
        ${isCurrent ? '<div id="hci-inpage-toc" class="space-y-0.5 my-1.5 border-l-2 border-zinc-200 ml-3.5 pl-1"></div>' : ''}
      </div>
    `;
  });

  navItemsHtml += `
        </div>
      </div>

      <!-- Highlighter Legend Box -->
      <div class="pt-2 border-t border-[#E4E2DD]">
        <div class="px-2 mb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          Highlighter Legend
        </div>
        <div class="p-2.5 rounded-xl bg-white border border-[#E4E2DD] space-y-1.5 text-[11px]">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded bg-yellow-200 border border-yellow-300 shrink-0"></span>
            <span class="text-zinc-700">Core Definition</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded bg-sky-200 border border-sky-300 shrink-0"></span>
            <span class="text-zinc-700">Principle / Model</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded bg-green-200 border border-green-300 shrink-0"></span>
            <span class="text-zinc-700">Cure / Redesign</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded bg-rose-200 border border-rose-300 shrink-0"></span>
            <span class="text-zinc-700">Symptom / Trap</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded bg-purple-200 border border-purple-300 shrink-0"></span>
            <span class="text-zinc-700">Case Study Fact</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // C. Dark Mode Theme Switcher Box (Togglable via left nav & 'T' key)
  const themeBoxHtml = `
    <div class="p-3 border-t border-[#E4E2DD] bg-[#FAF8F5] flex items-center justify-between gap-2 shrink-0 hci-theme-box">
      <div class="flex items-center gap-2.5 min-w-0">
        <span id="hci-theme-icon-slot" class="w-7 h-7 rounded-lg bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </span>
        <div class="leading-tight truncate">
          <div id="hci-theme-mode-title" class="text-xs font-bold text-zinc-800 truncate">Dark Mode</div>
          <div class="font-mono text-[10px] text-zinc-400 flex items-center gap-1">
            <span>Shortcut</span>
            <kbd class="px-1 py-0.2 rounded bg-zinc-200 text-zinc-700 font-mono text-[9px] font-bold">T</kbd>
          </div>
        </div>
      </div>
      <button id="hci-theme-toggle" class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-zinc-300" role="switch" aria-checked="false" title="Toggle Dark/Light Mode (Press 'T')">
        <span id="hci-theme-knob" class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0"></span>
      </button>
    </div>
  `;

  // D. Footer
  const footerHtml = `
    <div class="p-2.5 border-t border-[#E4E2DD] bg-[#FAF8F5] text-[10px] font-mono text-zinc-400 flex items-center justify-between shrink-0">
      <span>Dr. Damla Aslan</span>
      <span>IAU • Fall 2026</span>
    </div>
  `;

  sidebar.innerHTML = headerHtml + navItemsHtml + themeBoxHtml + footerHtml;
  navRoot.appendChild(sidebar);
  document.body.prepend(navRoot);

  // Apply Layout States
  function updateDesktopLayout() {
    if (window.innerWidth >= 1024) {
      if (isClosed) {
        document.body.classList.add('hci-sidebar-closed');
        document.body.classList.remove('hci-sidebar-open');
        sidebar.classList.add('desktop-closed');
        sidebar.classList.remove('desktop-open');
      } else {
        document.body.classList.add('hci-sidebar-open');
        document.body.classList.remove('hci-sidebar-closed');
        sidebar.classList.add('desktop-open');
        sidebar.classList.remove('desktop-closed');
      }
    } else {
      document.body.classList.remove('hci-sidebar-open', 'hci-sidebar-closed');
      sidebar.classList.remove('desktop-open', 'desktop-closed');
    }
  }

  // Initialize Layout
  updateDesktopLayout();
  window.addEventListener('resize', updateDesktopLayout);

  // Desktop Toggle Handlers
  function openDesktopSidebar() {
    isClosed = false;
    localStorage.setItem('hci_nav_closed', 'false');
    updateDesktopLayout();
  }

  function closeDesktopSidebar() {
    isClosed = true;
    localStorage.setItem('hci_nav_closed', 'true');
    updateDesktopLayout();
  }

  function toggleDesktopSidebar() {
    if (isClosed) {
      openDesktopSidebar();
    } else {
      closeDesktopSidebar();
    }
  }

  if (desktopTrigger) {
    desktopTrigger.addEventListener('click', openDesktopSidebar);
  }

  // Mobile Toggle Handlers (3-Dots on Top-Right)
  const dotsIcon = document.getElementById('hci-dots-icon');
  const closeIcon = document.getElementById('hci-mobile-close-icon');

  function openMobileNav() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.add('open');
    mobileTrigger.classList.add('hci-mobile-trigger-active');
    if (dotsIcon) dotsIcon.style.display = 'none';
    if (closeIcon) closeIcon.style.display = 'block';
  }

  function closeMobileNav() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('open');
    mobileTrigger.classList.remove('hci-mobile-trigger-active');
    if (dotsIcon) dotsIcon.style.display = 'block';
    if (closeIcon) closeIcon.style.display = 'none';
  }

  function toggleMobileNav() {
    const isOpen = sidebar.classList.contains('mobile-open');
    if (isOpen) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  }

  if (mobileTrigger) {
    mobileTrigger.addEventListener('click', toggleMobileNav);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeMobileNav);
  }

  // Unified Close Button in Sidebar Header
  const closeBtn = document.getElementById('hci-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.innerWidth >= 1024) {
        closeDesktopSidebar();
      } else {
        closeMobileNav();
      }
    });
  }

  // =========================================================================
  // THEME SWITCHER LOGIC (Dark Mode & Light Mode)
  // =========================================================================
  let toastTimer = null;

  function showThemeToast(msg, icon) {
    let toast = document.getElementById('hci-theme-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hci-theme-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 100;
        padding: 9px 18px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        transition: opacity 0.22s ease, transform 0.22s ease;
        pointer-events: none;
        opacity: 0;
        transform: translateY(12px);
      `;
      document.body.appendChild(toast);
    }

    const dark = document.documentElement.classList.contains('dark');
    toast.style.backgroundColor = dark ? '#272730' : '#18181B';
    toast.style.color = dark ? '#FDE047' : '#FFFFFF';
    toast.style.border = dark ? '1px solid #3F3F46' : '1px solid #27272A';
    toast.innerHTML = `<span style="font-size: 14px;">${icon}</span> <span>${msg}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
    }, 1500);
  }

  function applyTheme(dark, announce = false) {
    isDarkMode = dark;
    localStorage.setItem('hci_theme', isDarkMode ? 'dark' : 'light');

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const iconSlot = document.getElementById('hci-theme-icon-slot');
    const modeTitle = document.getElementById('hci-theme-mode-title');
    const toggleBtn = document.getElementById('hci-theme-toggle');
    const knob = document.getElementById('hci-theme-knob');

    if (iconSlot && modeTitle && toggleBtn && knob) {
      if (isDarkMode) {
        modeTitle.textContent = 'Light Mode';
        iconSlot.className = 'w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 transition-colors';
        iconSlot.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
        toggleBtn.setAttribute('aria-checked', 'true');
        toggleBtn.className = 'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-amber-400';
        knob.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-900 shadow ring-0 transition duration-200 ease-in-out translate-x-5';
      } else {
        modeTitle.textContent = 'Dark Mode';
        iconSlot.className = 'w-7 h-7 rounded-lg bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 transition-colors';
        iconSlot.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
        toggleBtn.setAttribute('aria-checked', 'false');
        toggleBtn.className = 'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-zinc-300';
        knob.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0';
      }
    }

    if (announce) {
      showThemeToast(isDarkMode ? 'Dark Mode On' : 'Light Mode On', isDarkMode ? '🌙' : '☀️');
    }
  }

  // Initialize theme button UI state
  applyTheme(isDarkMode, false);

  const themeToggleBtn = document.getElementById('hci-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      applyTheme(!isDarkMode, true);
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Ignore when typing in form inputs, textareas, or contenteditable
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (['INPUT', 'TEXTAREA'].includes(tag) || (document.activeElement && document.activeElement.isContentEditable)) {
      return;
    }

    // Press 'T' or 't' to toggle Dark Mode
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      applyTheme(!isDarkMode, true);
      return;
    }

    // Press Ctrl+B or [ to toggle Desktop Sidebar
    if (window.innerWidth >= 1024) {
      if ((e.ctrlKey && e.key.toLowerCase() === 'b') || (e.key === '[')) {
        e.preventDefault();
        toggleDesktopSidebar();
        return;
      }
    } else if (e.key === 'Escape') {
      closeMobileNav();
      return;
    }
  });

  // In-Page TOC Extraction & Scroll Spy
  function setupInPageTOC() {
    const tocContainer = document.getElementById('hci-inpage-toc');
    if (!tocContainer) return;

    // Scan for section elements or headings with IDs
    const sections = Array.from(document.querySelectorAll('div[id^="sec-"], section[id^="sec-"], div[id^="slide-"], section[id^="slide-"]'));
    if (sections.length === 0) return;

    sections.forEach((sec) => {
      const id = sec.getAttribute('id');
      if (!id) return;

      // Extract title from slide badge or heading
      let label = '';
      const badge = sec.querySelector('.font-mono, [class*="font-mono"]');
      const heading = sec.querySelector('h1, h2, h3');

      if (badge && heading) {
        label = badge.textContent.trim().replace(/\s+/g, ' ') + ' ' + heading.textContent.trim().replace(/\s+/g, ' ');
      } else if (heading) {
        label = heading.textContent.trim().replace(/\s+/g, ' ');
      } else {
        label = id.replace('sec-', '').replace('slide-', 'Slide ');
      }

      // Truncate long labels for sidebar
      if (label.length > 32) {
        label = label.substring(0, 30) + '...';
      }

      const a = document.createElement('a');
      a.href = '#' + id;
      a.className = 'hci-toc-link truncate';
      a.textContent = label;
      a.addEventListener('click', () => {
        if (window.innerWidth < 1024) closeMobileNav();
      });

      tocContainer.appendChild(a);
    });

    // Setup IntersectionObserver for TOC highlight
    const tocLinks = Array.from(tocContainer.querySelectorAll('.hci-toc-link'));
    if (tocLinks.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            tocLinks.forEach((link) => {
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('toc-active');
              } else {
                link.classList.remove('toc-active');
              }
            });
          }
        });
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  // Run TOC setup after DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupInPageTOC);
  } else {
    setupInPageTOC();
  }
})();

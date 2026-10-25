'use strict';

/*
 * GAAWOW EMS - Public Academy Portal
 *
 * SECURITY:
 * - This file is public and must never contain a Supabase service-role key.
 * - Only published rows from public_academy_info are requested.
 * - Database RLS remains responsible for enforcing access permissions.
 */

const SUPABASE_URL = 'https://mytyvqwrxnxpxnxpiicj.supabase.co';

/*
 * Use the same public/publishable key already used by your existing EMS pages.
 * Do not put a service_role or secret key here.
 */
const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_2AvWfupkF1b_s0RjIbAi5g_RqLCs145';

const DEFAULT_ACADEMY_INFO = {
  academy_name: 'GAAWOW Academy',
  tagline: 'Ilayska Aqoonta iyo Xirfadda',
  logo_url: 'https://i.ibb.co/4ZCRpm30/gaawow-logo.png',
  about_text:
    'Welcome to GAAWOW Academy, Ilayska Aqoonta iyo Xirfadda. This page provides general information and official contact details for our academy.',
  phone_primary: '615228824',
  phone_secondary: '625228824',
  public_email: '',
  website_url: 'https://gaawowacademy.com',
  location_text: 'Waaberi, Suuq Yaraha, Burhakaba, Bay, Somalia',
  office_hours: ''
};

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value == null ? '' : String(value);
}

function setSafeLink(id, value, fallback) {
  const element = document.getElementById(id);
  if (!element) return;

  const raw = String(value || fallback || '').trim();

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Unsupported URL protocol');
    }

    element.href = parsed.href;
    element.hidden = false;
  } catch (_) {
    element.href = fallback || '#';
  }
}

function setTelephone(id, phone) {
  const link = document.getElementById(id);
  if (!link) return;

  const value = String(phone || '').trim();
  const safePhone = value.replace(/[^\d+]/g, '');

  if (!safePhone) {
    link.textContent = 'Contact academy';
    link.removeAttribute('href');
    return;
  }

  link.href = 'tel:' + safePhone;
  link.textContent = value;
}

function setWebsite(rawWebsite) {
  const fallback = DEFAULT_ACADEMY_INFO.website_url;
  let website = fallback;

  try {
    const candidate = new URL(String(rawWebsite || fallback).trim());

    if (candidate.protocol === 'https:' || candidate.protocol === 'http:') {
      website = candidate.href;
    }
  } catch (_) {
    website = fallback;
  }

  const link = document.getElementById('websiteLink');
  const button = document.getElementById('websiteButton');

  if (link) {
    link.href = website;
    link.textContent = website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  if (button) {
    button.href = website;
  }
}

function applyAcademyInfo(info) {
  const data = { ...DEFAULT_ACADEMY_INFO, ...(info || {}) };

  setText('academyName', data.academy_name);
  setText('heroAcademyName', data.academy_name);
  setText('footerAcademyName', data.academy_name);
  setText('academyTagline', data.tagline);
  setText('heroAbout', data.about_text);
  setText('aboutAcademy', `${data.academy_name}, ${data.tagline}.`);
  setText('academyLocation', data.location_text);
  setText('contactLocation', data.location_text);

  const logo = document.getElementById('academyLogo');
  if (logo && data.logo_url) {
    try {
      const parsed = new URL(data.logo_url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        logo.src = parsed.href;
      }
    } catch (_) {
      // Keep the default logo if the configured URL is invalid.
    }
  }

  setTelephone('phonePrimaryLink', data.phone_primary);
  setTelephone('phoneSecondaryLink', data.phone_secondary);
  setWebsite(data.website_url);

  const emailRow = document.getElementById('emailRow');
  const emailLink = document.getElementById('emailLink');

  if (emailRow && emailLink && data.public_email) {
    const email = String(data.public_email).trim();

    // Only show a valid-looking email address.
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailLink.href = 'mailto:' + email;
      emailLink.textContent = email;
      emailRow.hidden = false;
    }
  }

  const hoursRow = document.getElementById('hoursRow');
  if (hoursRow && data.office_hours) {
    setText('officeHours', data.office_hours);
    hoursRow.hidden = false;
  }
}

async function loadPublicAcademyInfo() {
  const notice = document.getElementById('loadNotice');

  // The page remains usable with default information if Supabase is unavailable.
  applyAcademyInfo(DEFAULT_ACADEMY_INFO);

  if (!window.supabase || !window.supabase.createClient) {
    if (notice) notice.style.display = 'block';
    return;
  }

  try {
    const client = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await client
      .from('public_academy_info')
      .select(
        'academy_name,tagline,logo_url,about_text,phone_primary,phone_secondary,public_email,website_url,location_text,office_hours'
      )
      .eq('is_published', true)
      .limit(1);

    if (error) {
      console.error('Could not load public academy information:', error.message);
      if (notice) notice.style.display = 'block';
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      applyAcademyInfo(data[0]);
      if (notice) notice.style.display = 'none';
    } else {
      // No published record exists yet, so display the safe default information.
      if (notice) notice.style.display = 'block';
    }
  } catch (error) {
    console.error('Public academy portal error:', error);
    if (notice) notice.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setText('currentYear', new Date().getFullYear());
  loadPublicAcademyInfo();
});

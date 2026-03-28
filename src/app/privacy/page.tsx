import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/legal-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy | ENGAGED',
  description: 'Privacy Policy for ENGAGED',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        ENGAGED ("we", "us", "our") respects your privacy. This Privacy Policy explains what information we collect,
        how we use it, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account data</strong> (e.g. email, name) when you sign up.</li>
        <li><strong>Calendar content</strong> you create (events, attendance/RSVP information, comments).</li>
        <li><strong>Usage data</strong> (basic analytics, device/browser info) to improve reliability and performance.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Provide and operate the service (authentication, calendars, event features).</li>
        <li>Improve product experience, performance, and security.</li>
        <li>Communicate service-related messages (e.g. confirmations, important updates).</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We may share information with service providers (e.g. hosting,
        analytics, email delivery) only to operate ENGAGED, subject to appropriate safeguards.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your data as long as needed to provide the service and comply with legal obligations. You may request
        deletion of your account where supported.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Access and update your account information.</li>
        <li>Request deletion of your account and associated data.</li>
        <li>Control optional cookies/analytics where applicable.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        If you have questions, contact us at: <em>support@engaged.app</em> (replace with your real support email).
      </p>

      <p className="text-sm text-gray-500">
        This page is provided as a starter template and is not legal advice.
      </p>
    </LegalLayout>
  );
}

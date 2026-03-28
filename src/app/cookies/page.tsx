import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/legal-layout';

export const metadata: Metadata = {
  title: 'Cookie Policy | ENGAGED',
  description: 'Cookie Policy for ENGAGED',
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy">
      <p>
        ENGAGED uses cookies and similar technologies to provide and improve the Service. This Cookie Policy explains
        what they are and how we use them.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device. They help websites remember your preferences and enable
        core functionality.
      </p>

      <h2>How we use cookies</h2>
      <ul>
        <li><strong>Essential</strong>: required for authentication and core site features.</li>
        <li><strong>Preferences</strong>: remember settings (where applicable).</li>
        <li><strong>Analytics</strong>: help us understand usage to improve performance (where enabled).</li>
      </ul>

      <h2>Your controls</h2>
      <p>
        You can usually control cookies through your browser settings. Disabling some cookies may impact functionality.
      </p>

      <h2>Updates</h2>
      <p>
        We may update this Cookie Policy from time to time.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <em>support@engaged.app</em> (replace with your real support email).
      </p>

      <p className="text-sm text-gray-500">
        This page is provided as a starter template and is not legal advice.
      </p>
    </LegalLayout>
  );
}

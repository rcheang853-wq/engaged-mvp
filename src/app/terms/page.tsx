import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/legal-layout';

export const metadata: Metadata = {
  title: 'Terms of Service | ENGAGED',
  description: 'Terms of Service for ENGAGED',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service ("Terms") govern your use of ENGAGED (the "Service"). By using the Service, you agree
        to these Terms.
      </p>

      <h2>Eligibility</h2>
      <p>You must be legally able to form a contract to use the Service.</p>

      <h2>Your account</h2>
      <ul>
        <li>You are responsible for maintaining the security of your account.</li>
        <li>You must provide accurate information and keep it up to date.</li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not misuse the Service or attempt to access it in unauthorized ways.</li>
        <li>Do not upload unlawful, harmful, or infringing content.</li>
        <li>Do not interfere with the Service’s availability or security.</li>
      </ul>

      <h2>Content</h2>
      <p>
        You retain ownership of content you create. You grant us a limited license to host and display your content
        solely to operate the Service.
      </p>

      <h2>Third-party services</h2>
      <p>
        The Service may integrate with third-party providers (e.g. hosting, email). Their terms may apply.
      </p>

      <h2>Disclaimers</h2>
      <p>
        The Service is provided “as is” without warranties of any kind. We do not guarantee uninterrupted or error-free
        operation.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, ENGAGED will not be liable for indirect or consequential damages.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes means you accept the
        updated Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms: <em>support@engaged.app</em> (replace with your real support email).
      </p>

      <p className="text-sm text-gray-500">
        This page is provided as a starter template and is not legal advice.
      </p>
    </LegalLayout>
  );
}

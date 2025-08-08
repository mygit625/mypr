import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms and Conditions for the use of ToolsInn and its free online tools and services.',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="prose dark:prose-invert lg:prose-lg">
        <h1>Terms and Conditions</h1>
        <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <p>
          Please read these Terms and Conditions ("Terms") carefully before using the toolsinn.com website (the "Service") operated by ToolsInn ("us", "we", or "our").
        </p>
        <p>
          Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who wish to access or use the Service.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you do not have permission to access the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          ToolsInn provides a collection of free online tools, including but not limited to PDF converters, image editors, AI-powered document tools, and other utilities. The Service is provided "AS IS" and is subject to change or termination without notice.
        </p>

        <h2>3. User Conduct and Responsibilities</h2>
        <p>
          You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You are solely responsible for the content of any files you upload for processing. You agree not to upload files that:
        </p>
        <ul>
          <li>Contain viruses, malware, or other malicious code.</li>
          <li>Infringe upon the intellectual property rights of others.</li>
          <li>Contain illegal, hateful, or obscene content.</li>
        </ul>
        <p>
            We reserve the right to suspend or terminate access to our services for any user who violates these terms.
        </p>

        <h2>4. Disclaimer of Warranties</h2>
        <p>
          The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, expressed or implied, regarding the operation of our Service or the information, content, or materials included therein. You expressly agree that your use of the Service is at your sole risk.
        </p>
        <p>
          We do not warrant that the Service, its servers, or e-mail sent from us are free of viruses or other harmful components. We will not be liable for any damages of any kind arising from the use of this site, including, but not limited to direct, indirect, incidental, punitive, and consequential damages.
        </p>
        
        <h2>5. Limitation of Liability</h2>
        <p>
            In no event shall ToolsInn, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
        </p>
        
        <h2>6. Intellectual Property</h2>
        <p>
          We claim no intellectual property rights over the files you upload. All uploaded materials remain your property. By using our service, you grant us a non-exclusive, worldwide, royalty-free license to temporarily store and process your files solely for the purpose of providing the requested service.
        </p>

        <h2>7. Changes to Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us:
        </p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:info@toolsinn.com">info@toolsinn.com</a></li>
          <li><strong>WhatsApp:</strong> <a href="https://wa.me/16177953747" target="_blank" rel="noopener noreferrer">+1 617 795 37 47</a></li>
        </ul>
      </div>
    </div>
  );
}

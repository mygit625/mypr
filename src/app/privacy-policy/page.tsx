import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for ToolsInn, detailing how we handle your data and protect your privacy when you use our free online tools.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="prose dark:prose-invert lg:prose-lg">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <p>
          Welcome to ToolsInn ("we", "us", "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, toolsinn.com, and use our services (collectively, "Services"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          We may collect information about you in a variety of ways. The information we may collect on the Site includes:
        </p>
        <ul>
          <li>
            <strong>Uploaded Files:</strong> When you use our tools (e.g., PDF Tools, Image Tools), you may upload files to our servers for processing. We handle these files as described in the "File Processing and Security" section below.
          </li>
          <li>
            <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and demographic information, that you voluntarily give to us when you register for an account.
          </li>
          <li>
            <strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.
          </li>
        </ul>

        <h2>2. Use of Your Information</h2>
        <p>
          Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
        </p>
        <ul>
          <li>Create and manage your account.</li>
          <li>Provide and deliver the tools and services you request.</li>
          <li>Improve our website and services.</li>
          <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
          <li>Respond to your comments, questions, and provide customer service.</li>
        </ul>

        <h2>3. File Processing and Security</h2>
        <p>
          We understand that the files you upload for processing may be sensitive. Our commitment to your privacy is paramount:
        </p>
        <ul>
          <li>
            <strong>Temporary Storage:</strong> Files you upload are stored on our servers only for the duration required to perform the requested operation.
          </li>
          <li>
            <strong>Automatic Deletion:</strong> We automatically delete all uploaded files and their processed outputs from our servers after a short period (typically 1 hour). We do not create permanent archives or backups of your files.
          </li>
          <li>
            <strong>No Manual Access:</strong> We do not access, view, or copy your files. The entire process is automated.
          </li>
          <li>
            <strong>AI Tools:</strong> For services like our AI Cover Letter Generator or PDF Summarizer, the content of your uploaded document (e.g., CV) is sent to a third-party AI provider (like Google's Gemini) for processing. These providers have their own privacy policies, and we do not store the content on our servers after the AI has processed it.
          </li>
        </ul>

        <h2>4. Disclosure of Your Information</h2>
        <p>
          We do not share, sell, rent, or trade your personal information or files with third parties for their commercial purposes. We may share information we have collected about you in certain situations, such as with our third-party service providers (e.g., AI models, hosting providers) that perform services for us or on our behalf.
        </p>

        <h2>5. Your Data Rights and Deletion</h2>
        <p>
          You have the right to access, update, or delete your personal information associated with your account.
        </p>
        <p>
          For detailed instructions on how to permanently delete your account and associated data, please visit our <Link href="/data-deletion">Data Deletion Instructions</Link> page.
        </p>

        <h2>6. Security of Your Information</h2>
        <p>
          We use administrative, technical, and physical security measures to help protect your personal information and files. While we have taken reasonable steps to secure the information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
        </p>

        <h2>7. Contact Us</h2>
        <p>
          If you have questions or comments about this Privacy Policy, please contact us:
        </p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:info@toolsinn.com">info@toolsinn.com</a></li>
          <li><strong>WhatsApp:</strong> <a href="https://wa.me/16177953747" target="_blank" rel="noopener noreferrer">+1 617 795 37 47</a></li>
        </ul>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions',
  description: 'Instructions on how to delete your account and personal data from ToolsInn.',
};

export default function DataDeletionPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="prose dark:prose-invert lg:prose-lg">
        <h1>Data Deletion Instructions</h1>
        <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <p>
          At ToolsInn, we respect your right to privacy and control over your personal data. This page provides clear instructions on how to request the deletion of your account and associated information from our systems.
        </p>

        <h2>1. Deletion of Uploaded Files</h2>
        <p>
          As stated in our Privacy Policy, we do not permanently store the files you upload to use our tools. All uploaded files and their processed results are **automatically and permanently deleted** from our servers after a short period (typically 1 hour).
        </p>
        <p>
          <strong>You do not need to take any action to have your uploaded files deleted.</strong> This process is automatic.
        </p>

        <h2>2. Deletion of Your User Account</h2>
        <p>
          If you have created an account with us, you can request the permanent deletion of your account and all associated personal data (such as your name, email address, and account settings).
        </p>
        <p>
          To request account deletion, please follow these steps:
        </p>
        <ol>
          <li>
            <strong>Send an Email:</strong> Compose an email from the email address associated with your ToolsInn account.
          </li>
          <li>
            <strong>To:</strong> Send the email to <a href="mailto:info@toolsinn.com?subject=Account Deletion Request">info@toolsinn.com</a>.
          </li>
          <li>
            <strong>Subject Line:</strong> Please use the subject line "Account Deletion Request".
          </li>
          <li>
            <strong>Body of the Email:</strong> In the body of the email, please clearly state that you wish to delete your account. For verification purposes, please include your username or the email address registered with us.
          </li>
        </ol>

        <h2>3. What Happens Next?</h2>
        <p>
          Once we receive your deletion request, we will:
        </p>
        <ul>
            <li>Verify that the request is coming from the legitimate account owner. We may send a confirmation email to your registered address.</li>
            <li>Once verified, we will initiate the process of permanently deleting your account and all associated personal data from our databases.</li>
            <li>This process is irreversible. Once your account is deleted, it cannot be recovered.</li>
            <li>We will process your request within 30 days of verification and send you a final confirmation once the deletion is complete.</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about the data deletion process, please do not hesitate to contact us:
        </p>
         <ul>
          <li><strong>Email:</strong> <a href="mailto:info@toolsinn.com">info@toolsinn.com</a></li>
          <li><strong>WhatsApp:</strong> <a href="https://wa.me/16177953747" target="_blank" rel="noopener noreferrer">+1 617 795 37 47</a></li>
        </ul>
      </div>
    </div>
  );
}

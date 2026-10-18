import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, ContactLine } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — Plate" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what personal information Plate (&quot;we&quot;, &quot;us&quot;) collects when you use the
        Plate meal-planning app, why, who we share it with, and the choices you have. We handle personal information in
        line with the Australian Privacy Principles in the <em>Privacy Act 1988</em> (Cth).
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address and profile picture, provided when you sign in with
          Google or an email link.
        </li>
        <li>
          <strong>Your preferences:</strong> household size, suburb and postcode, preferred supermarket, budget, cooking
          time, cuisines, proteins, calorie and macro goals, and dietary requirements. Dietary requirements (for example
          vegetarian or gluten-free) can reveal health or religious information; we use them only to plan your meals.
        </li>
        <li>
          <strong>What you do in the app:</strong> meal plans, recipe feedback (thumbs up/down, swaps), pantry items,
          staples, shopping lists and orders you mark as placed.
        </li>
        <li>
          <strong>Usage and device information:</strong> pages viewed and actions such as generating a plan or building a
          cart, plus device, browser and error details, so we can improve the app and fix problems.
        </li>
        <li>
          <strong>Payments:</strong> if you subscribe to Premium, our payment provider Stripe collects your card details.
          We never see or store your full card number; we keep your subscription status and Stripe customer reference.
        </li>
        <li>
          <strong>Messages you send us:</strong> anything you write in the in-app Report form, with the page you were on.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your weekly meal plans and shopping lists and keep them in sync across your devices.</li>
        <li>To personalise recommendations based on your preferences and feedback.</li>
        <li>To run Premium subscriptions and billing.</li>
        <li>
          To send the weekly planning reminder, only if you turn it on in Settings. Every reminder has an unsubscribe
          link.
        </li>
        <li>To keep the service secure, prevent abuse, fix errors and understand how the app is used.</li>
      </ul>
      <p>We don&apos;t sell your personal information and we don&apos;t use it for third-party advertising.</p>

      <h2>Who we share it with</h2>
      <p>We use these service providers to run Plate. They process information on our behalf:</p>
      <ul>
        <li><strong>Clerk</strong>: sign-in and account management.</li>
        <li><strong>Vercel</strong>: hosting, plus privacy-friendly page analytics and performance monitoring.</li>
        <li><strong>Neon</strong>: our database.</li>
        <li><strong>Upstash</strong>: rate limiting and temporary caching.</li>
        <li><strong>Stripe</strong>: payments for Premium.</li>
        <li><strong>Resend</strong>: sending reminder emails.</li>
        <li><strong>PostHog</strong>: product analytics (which features are used).</li>
        <li><strong>Sentry</strong>: error reporting.</li>
        <li>
          <strong>Anthropic</strong>: for Premium plans, your meal preferences, dietary requirements and recipe feedback
          are sent to Anthropic&apos;s Claude AI to choose your week&apos;s recipes. Your name and email are not sent.
        </li>
      </ul>
      <p>
        Plate is not affiliated with Woolworths or Coles. Opening a supermarket link takes you to their website, which has
        its own privacy policy; we don&apos;t send them your information.
      </p>
      <p>
        Most of these providers store data outside Australia, mainly in the United States. We choose providers that
        protect personal information to a standard comparable to the Australian Privacy Principles. We may also disclose
        information if required by law.
      </p>

      <h2>Storage on your device</h2>
      <p>
        Plate keeps a copy of your plan, cart and preferences in your browser&apos;s local storage so the app works quickly
        and offline. Sign-in and analytics providers also use cookies or local storage. Signing out clears Plate&apos;s
        copy from that device.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while you have an account. If you delete your account, we delete your account and app
        data straight away, apart from records we must keep for legal or tax reasons (such as payment records held by
        Stripe). Backups and logs held by our providers expire on their own schedules.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          <strong>Access and correction:</strong> you can view and edit your preferences in Settings at any time, or ask us
          for a copy of the information we hold about you.
        </li>
        <li>
          <strong>Reset:</strong> Settings &gt; Reset all data deletes your plans, history, pantry and preferences but
          keeps your account.
        </li>
        <li>
          <strong>Delete your account:</strong> Settings &gt; Delete account permanently deletes your account and data and
          cancels any Premium subscription.
        </li>
        <li><strong>Emails:</strong> turn the weekly reminder on or off in Settings, or use the link in any reminder.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Information is encrypted in transit, access to it is restricted, and we rely on established providers for
        sign-in and payments. No system is completely secure, but we work to protect your information and will tell you
        if a data breach is likely to cause you serious harm.
      </p>

      <h2>Children</h2>
      <p>Plate is intended for people aged 16 and over who plan meals for their household.</p>

      <h2>Questions and complaints</h2>
      <p>
        To ask a question, request a copy of your information or make a complaint, <ContactLine />. We aim to respond
        within 30 days. If you&apos;re not satisfied with our response, you can contact the Office of the Australian
        Information Commissioner at <a href="https://www.oaic.gov.au">oaic.gov.au</a>.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy as Plate changes. We&apos;ll update the effective date above and, for significant
        changes, let you know in the app. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}

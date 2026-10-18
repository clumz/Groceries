import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, ContactLine } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service — Plate" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms apply when you use Plate, a weekly meal-planning app operated by Plate (&quot;we&quot;,
        &quot;us&quot;). By creating an account or using Plate you agree to them. Please also read our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What Plate does</h2>
      <p>
        Plate suggests weekly meal plans and recipes, turns them into a shopping list, and helps you shop at Woolworths
        or Coles. Plate doesn&apos;t place orders, take payment for groceries or deliver anything: you shop and pay on the
        supermarket&apos;s own website or in store.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 16 or older to use Plate.</li>
        <li>Keep your sign-in secure. You&apos;re responsible for activity on your account.</li>
        <li>You can delete your account at any time in Settings.</li>
      </ul>

      <h2>Food, allergies and nutrition</h2>
      <p>
        Recipes, nutrition estimates and dietary filters are a guide only. They may contain errors and are not medical
        or dietetic advice. Always check ingredient and product labels yourself, especially for allergies, intolerances or
        medical conditions, and follow safe food handling and cooking practices.
      </p>

      <h2>Prices and products</h2>
      <p>
        Prices and product matches come from our own catalogue and are estimates. They may not match current supermarket
        prices, specials or stock. The supermarket&apos;s price at checkout is the one that applies. Plate isn&apos;t
        affiliated with, endorsed by or sponsored by Woolworths or Coles; their names are used only to identify where you
        shop.
      </p>

      <h2>Premium subscription</h2>
      <ul>
        <li>
          Premium is a recurring subscription billed through Stripe at the price shown when you subscribe. It renews
          automatically each billing period until you cancel.
        </li>
        <li>
          You can cancel any time from Settings &gt; Manage subscription. Cancelling stops future renewals; you keep Premium
          until the end of the period you&apos;ve paid for.
        </li>
        <li>
          Premium plans are chosen with the help of AI. If the AI service is unavailable, Plate creates your plan with
          its standard planner instead.
        </li>
        <li>
          We&apos;ll give you notice before changing the Premium price. The new price applies from your next billing
          period after the notice.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t misuse Plate: no attempting to break or overload the service, access other people&apos;s accounts or
        data, scrape it, or use it for anything unlawful. We may suspend or close accounts that do.
      </p>

      <h2>Our content</h2>
      <p>
        The Plate app, design and recipe collection belong to us or our licensors. You may use them for your own
        household&apos;s meal planning. Feedback you send us may be used to improve Plate.
      </p>

      <h2>Australian Consumer Law</h2>
      <p>
        Nothing in these terms excludes, restricts or modifies any consumer guarantee, right or remedy you have under the
        Australian Consumer Law that cannot lawfully be excluded. Subject to that, Plate is provided &quot;as is&quot;,
        and to the extent permitted by law we&apos;re not liable for indirect or consequential loss arising from your use
        of Plate. Where our liability for failing to meet a consumer guarantee can be limited, it&apos;s limited to
        supplying the service again or refunding what you paid for it.
      </p>

      <h2>Changes and ending the service</h2>
      <p>
        We may update Plate and these terms. For significant changes we&apos;ll tell you in the app before they take
        effect; continuing to use Plate afterwards means you accept them. If we ever shut Plate down, we&apos;ll give
        reasonable notice and refund any unused part of a prepaid Premium period.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of Australia.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? <ContactLine />.
      </p>
    </LegalPage>
  );
}

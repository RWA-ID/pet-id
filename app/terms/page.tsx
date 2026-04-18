export const runtime = "edge";

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px", fontFamily: "sans-serif", color: "#1a1a1a", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: "#666", marginBottom: 48 }}>Last updated: April 17, 2026</p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>1. Acceptance</h2>
        <p>
          By registering a PetID, you agree to these Terms of Service. If you do not agree, do not use the service.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>2. Service Description</h2>
        <p>
          PetID registers ENS subdomains under <strong>dogid.eth</strong> and <strong>catid.eth</strong> on the Ethereum mainnet,
          creates an IPFS-hosted public profile for your pet, and delivers a QR code tag you can attach to your pet's collar.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>3. Payments and Refunds</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li>Fiat registrations cost $19.99 USD, processed by Helio.</li>
          <li>Crypto registrations cost 0.00825 ETH plus gas fees, paid directly on-chain.</li>
          <li>All sales are final. Due to the irreversible nature of blockchain transactions, refunds are not available once an ENS subdomain has been registered.</li>
          <li>If registration fails after payment, we will re-attempt or issue a refund at our discretion.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>4. Subdomain Availability</h2>
        <p>
          Subdomains are granted on a first-come, first-served basis. We do not guarantee availability of any specific name.
          We reserve the right to refuse registration of names that are offensive, infringing, or otherwise inappropriate.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>5. Permanent Data</h2>
        <p>
          ENS registrations and IPFS content are stored on public decentralized networks and cannot be deleted.
          You are responsible for ensuring that the content you submit (photos, pet names) is appropriate and does not infringe third-party rights.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>6. Disclaimer of Warranties</h2>
        <p>
          PetID is provided "as is." We make no warranties regarding uptime, ENS resolver availability, or IPFS gateway reliability.
          We are not responsible for losses arising from blockchain network congestion, wallet errors, or third-party service outages.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, PetID's total liability for any claim is limited to the amount you paid for the registration in question.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>8. Changes to Terms</h2>
        <p>
          We may update these terms at any time. Continued use of the service after changes constitutes acceptance.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>9. Contact</h2>
        <p>
          Questions? Email{" "}
          <a href="mailto:petid@onchain-id.id" style={{ color: "#8B4513" }}>petid@onchain-id.id</a>.
        </p>
      </section>
    </main>
  );
}

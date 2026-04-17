export const runtime = "edge";

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px", fontFamily: "sans-serif", color: "#1a1a1a", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 48 }}>Last updated: April 17, 2026</p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>1. Information We Collect</h2>
        <p>When you register a PetID, we collect:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>Your pet's name and the subdomain you choose (e.g., <em>buddy.dogid.eth</em>)</li>
          <li>A photo of your pet (uploaded to IPFS — public and permanent)</li>
          <li>Your email address (used to send your pet's profile link and QR tag)</li>
          <li>Your wallet address, if you pay with crypto</li>
          <li>Payment information processed by Helio (fiat) — we never store card data</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>2. How We Use Your Information</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li>To register your pet's ENS subdomain on the Ethereum blockchain</li>
          <li>To generate and deliver your pet's public profile page</li>
          <li>To send your QR tag link via email</li>
          <li>To process payments through Helio</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>3. Public Data</h2>
        <p>
          ENS subdomain registrations and IPFS profile content are stored on public, decentralized infrastructure.
          Once published, this data cannot be deleted or altered — this is inherent to blockchain and IPFS technology.
          Only register information you are comfortable being publicly visible.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>4. Third-Party Services</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Helio</strong> — processes fiat payments. Subject to Helio's privacy policy.</li>
          <li><strong>Pinata</strong> — stores pet photos and profile HTML on IPFS.</li>
          <li><strong>Supabase</strong> — stores registration records during processing.</li>
          <li><strong>Resend</strong> — delivers transactional emails.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>5. Data Retention</h2>
        <p>
          Off-chain records (email, payment metadata) are retained as long as necessary to operate the service.
          On-chain and IPFS data is permanent and cannot be removed.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>6. Contact</h2>
        <p>
          Questions about this policy? Email us at{" "}
          <a href="mailto:petid@onchain-id.id" style={{ color: "#8B4513" }}>petid@onchain-id.id</a>.
        </p>
      </section>
    </main>
  );
}

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "60px",
        padding: "30px",
        borderTop: "1px solid #ddd",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "15px",
        }}
      >
        <a href="/privacy-policy">
          Privacy Policy
        </a>

        <a href="/terms-of-service">
          Terms of Service
        </a>
        <a href="/cookie-policy">
  Cookie Policy
</a>

        <a href="/contact">
          Contact
        </a>
        <a href="/tools">Tools</a>

<a href="/faq">FAQ</a>
      </div>

      <p
        style={{
          color: "#666",
        }}
      >
        © {new Date().getFullYear()} Pixores.
        All rights reserved.
      </p>
    </footer>
  );
}
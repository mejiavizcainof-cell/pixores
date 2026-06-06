type ToolSeoProps = {
  title: string;
  description: string;
  benefits?: string[];
};

export default function ToolSeo({
  title,
  description,
  benefits,
}: ToolSeoProps) {
  return (
    <section
      style={{
        marginTop: "60px",
        lineHeight: "1.8",
      }}
    >
      <h2
        style={{
          fontSize: "32px",
          marginBottom: "20px",
        }}
      >
        {title}
      </h2>

      <p>{description}</p>

      <h3
        style={{
          marginTop: "30px",
          marginBottom: "15px",
        }}
      >
        Why Use Pixores?
      </h3>

      <ul
        style={{
          paddingLeft: "20px",
        }}
      >
        {(benefits ?? [
          "Free online tool",
          "No registration required",
          "Fast processing",
          "Secure file conversion",
          "Works on desktop and mobile",
        ]).map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>
    </section>
  );
}
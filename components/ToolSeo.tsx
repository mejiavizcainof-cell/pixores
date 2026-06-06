import {
  COLORS,
  FONT_SIZES,
} from "@/lib/theme";

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
        marginTop: "80px",
        lineHeight: "1.9",
      }}
    >
      <h2
        style={{
          fontSize: FONT_SIZES.h2,
          color: COLORS.title,
          fontWeight: 700,
          marginBottom: "20px",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          color: COLORS.text,
          fontSize: FONT_SIZES.body,
          marginBottom: "30px",
        }}
      >
        {description}
      </p>

      <h3
        style={{
          color: COLORS.title,
          fontSize: "24px",
          fontWeight: 600,
          marginBottom: "15px",
        }}
      >
        Why Use Pixores?
      </h3>

      <ul
        style={{
          paddingLeft: "24px",
          color: COLORS.text,
          fontSize: FONT_SIZES.body,
        }}
      >
        {(benefits ?? [
          "Free online tool",
          "No registration required",
          "Fast processing",
          "Secure file conversion",
          "Works on desktop and mobile",
        ]).map((benefit) => (
          <li
            key={benefit}
            style={{
              marginBottom: "10px",
            }}
          >
            {benefit}
          </li>
        ))}
      </ul>
    </section>
  );
}
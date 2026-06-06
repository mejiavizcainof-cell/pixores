import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn more about Pixores and our mission to provide free online image and file tools.",
};

export default function AboutPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px",
        lineHeight: "1.8",
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          marginBottom: "20px",
        }}
      >
        About Pixores
      </h1>

      <p>
        Pixores is a free online platform that helps users
        convert, compress, resize, and optimize images
        quickly and securely.
      </p>

      <p>
        Our goal is simple: provide easy-to-use image tools
        that work directly in your browser without requiring
        software installation, subscriptions, or technical
        knowledge.
      </p>

      <h2>Our Mission</h2>

      <p>
        We believe image processing should be fast,
        accessible, and available to everyone. Whether you
        are a designer, developer, marketer, student, or
        business owner, Pixores helps you work with image
        files efficiently.
      </p>

      <h2>What We Offer</h2>

      <ul>
        <li>JPG to PNG conversion</li>
        <li>PNG to JPG conversion</li>
        <li>JPG to WebP conversion</li>
        <li>PNG to WebP conversion</li>
        <li>WebP to JPG conversion</li>
        <li>WebP to PNG conversion</li>
        <li>HEIC to JPG conversion</li>
        <li>JPG to PDF conversion</li>
        <li>Image compression</li>
        <li>Image resizing</li>
        <li>Favicon generation tools</li>
      </ul>

      <h2>Privacy First</h2>

      <p>
        We take user privacy seriously. Files uploaded to
        Pixores are processed only for the purpose of
        completing the requested task and are not stored
        longer than necessary.
      </p>

      <h2>Why Choose Pixores?</h2>

      <ul>
        <li>Free to use</li>
        <li>Fast processing</li>
        <li>No registration required</li>
        <li>Works on desktop and mobile</li>
        <li>Secure file handling</li>
        <li>Simple and intuitive interface</li>
      </ul>

      <h2>Contact Us</h2>

      <p>
        Have questions, suggestions, or feedback?
        We'd love to hear from you.
      </p>

      <p>
        Email: support@pixores.com
      </p>
    </main>
  );
}
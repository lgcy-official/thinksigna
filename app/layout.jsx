import "./globals.css";

export const metadata = {
  title: "Account Enrichment Agent",
  description: "Live account intelligence and outreach generation."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

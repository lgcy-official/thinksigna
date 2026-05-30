import "./globals.css";

export const metadata = {
  title: "ThinkSignal",
  description: "Live account signals and outreach generation."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

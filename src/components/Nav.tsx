import Link from "next/link";

const links = [
  ["/live", "Live"],
  ["/trending", "Trending"],
  ["/emerging", "Emerging"]
];

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        CLIPPED IT
      </Link>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="link">
          {label}
        </Link>
      ))}
    </nav>
  );
}

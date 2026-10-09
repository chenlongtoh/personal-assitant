import Link from "next/link";

export default function NotFound() {
  return (
    <section className="missing">
      <p className="kicker">Missing</p>
      <h1>No brief for that day.</h1>
      <p>
        <Link href="/">Read the latest morning</Link> or browse the{" "}
        <Link href="/archive">archive</Link>.
      </p>
    </section>
  );
}

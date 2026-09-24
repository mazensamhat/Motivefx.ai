export function MotiveOneSpotlight() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="overflow-hidden rounded-3xl border border-sky-400/20 bg-[radial-gradient(circle_at_82%_10%,rgba(22,139,255,.17),transparent_32%),linear-gradient(135deg,rgba(8,20,34,.98),rgba(3,8,14,.98))] p-7 text-white shadow-2xl sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-300">From Motive-Corp</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              Meet <span className="text-[#168BFF]">MotiveOne</span>.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              CRM for a Brighter Business — an AI-powered operating system for customers, bookings,
              payments, memberships, staff, marketing, analytics, customization, and a branded customer app.
            </p>
            <a
              href="https://motive1crm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#168BFF] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Explore MotiveOne →
            </a>
          </div>
          <div className="grid gap-3">
            {[
              ["AI-native CRM", "Business context across customers, revenue, bookings and operations."],
              ["Your branded app", "A customer-facing iOS and Android experience under your brand."],
              ["Custom workflows", "Shape roles, automations, services, memberships and integrations around the business."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
                <p className="font-semibold text-sky-300">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

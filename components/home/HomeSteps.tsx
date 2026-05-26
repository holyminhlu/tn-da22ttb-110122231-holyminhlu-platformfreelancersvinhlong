import { STEPS } from "./data";
import { StepIcon } from "./icons";

export default function HomeSteps() {
  return (
    <section id="steps" className="border-b border-t border-gray-100 bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">It&apos;s Easy to Get Work Done on VLC Connected</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                <StepIcon name={step.icon} className="text-2xl text-blue-500" />
              </div>
              <h3 className="mb-3 font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <button
            type="button"
            className="rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
          >
            See How It Works
          </button>
        </div>
      </div>
    </section>
  );
}

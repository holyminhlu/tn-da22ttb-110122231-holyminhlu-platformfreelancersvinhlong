import { FaCheckCircle, FaHandHoldingUsd, FaTools } from "./icons";

export default function HomeEnterprise() {
  return (
    <section className="enterprise-bg py-24 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-20 px-6 lg:flex-row">
        <div className="text-center lg:text-left">
          <div className="mb-6">
            <span className="text-3xl font-bold tracking-tight">VLC</span>
            <span className="ml-2 text-2xl font-light">ENTERPRISE</span>
          </div>
          <div className="my-6 h-px w-20 bg-gray-600" />
        </div>
        <div className="flex-1">
          <h2 className="mb-8 text-2xl font-bold">Custom Enterprise Solutions for Your Business.</h2>
          <ul className="space-y-6">
            <li className="flex items-center space-x-4">
              <FaTools className="text-xl text-blue-400" />
              <span className="font-medium">Custom Built Solutions</span>
            </li>
            <li className="flex items-center space-x-4">
              <FaCheckCircle className="text-xl text-blue-400" />
              <span className="font-medium">Compliance &amp; Security Benefits</span>
            </li>
            <li className="flex items-center space-x-4">
              <FaHandHoldingUsd className="text-xl text-blue-400" />
              <span className="font-medium">Industry Lowest Fees</span>
            </li>
          </ul>
          <div className="mt-10">
            <button
              type="button"
              className="rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
            >
              Learn About VLC Enterprise
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

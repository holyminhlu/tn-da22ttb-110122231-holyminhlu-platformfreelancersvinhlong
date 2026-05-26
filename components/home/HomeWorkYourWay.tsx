import Image from "next/image";
import { FaCircle, FaDotCircle } from "./icons";

export default function HomeWorkYourWay() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">Work Your Way</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>
        <div className="flex flex-col items-center gap-16 lg:flex-row">
          <div className="flex-1">
            <Image
              src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=800"
              alt="Work your way"
              width={800}
              height={500}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
          <div className="flex-1 space-y-6">
            <h3 className="mb-6 text-xl font-bold">
              Choose from four Payment terms and create Agreements.
            </h3>
            <div className="space-y-4">
              <div className="rounded border border-blue-500 bg-blue-50 p-4">
                <div className="mb-2 flex items-center font-bold text-blue-600">
                  <FaDotCircle className="mr-3" /> Fixed Price
                </div>
                <p className="pl-8 text-sm text-gray-600">
                  Set a total fixed cost for your job and create milestones to ensure you&apos;re
                  satisfied every step of the way. Set a due date and the amount to be paid for each
                  milestone.
                </p>
              </div>
              <div className="flex items-center rounded border border-gray-200 p-4 font-bold text-gray-700">
                <FaCircle className="mr-3" /> Hourly
              </div>
              <div className="flex items-center rounded border border-gray-200 p-4 font-bold text-gray-700">
                <FaCircle className="mr-3" /> Task-Based
              </div>
              <div className="flex items-center rounded border border-gray-200 p-4 font-bold text-gray-700">
                <FaCircle className="mr-3" /> Recurring Payment
              </div>
            </div>
            <div className="pt-6">
              <button
                type="button"
                className="rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                Learn About Agreements
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

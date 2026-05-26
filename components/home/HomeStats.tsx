import { STATS } from "./data";
import { StatIcon } from "./icons";

export default function HomeStats() {
  return (
    <div className="relative z-20 mx-auto -mt-12 max-w-6xl px-6">
      <div className="flex flex-col items-stretch justify-between gap-6 rounded bg-white px-8 py-8 shadow-xl md:flex-row md:items-center">
        {STATS.map((stat, index) => {
          const highlight = "highlight" in stat && stat.highlight;
          return (
          <div
            key={stat.label}
            className={`flex flex-1 items-center justify-center space-x-4 ${
              highlight
                ? "scale-105 rounded-lg bg-white p-6 shadow-2xl md:scale-110"
                : index < STATS.length - 1
                  ? "border-b border-gray-100 pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-4"
                  : ""
            }`}
          >
            <StatIcon name={stat.icon} className="text-3xl text-blue-500" />
            <div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

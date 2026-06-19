import { apiPaths } from "@/config/api.config";
import { fetchApi } from "./client";

export type AiCompareVerdict = "leading" | "competitive" | "trailing";
export type AiCompareConfidence = "high" | "medium" | "low";

export type AiQuoteCompareAnalysis = {
  summary: string;
  focusedFreelancer: {
    quoteId: string;
    name: string;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
  };
  criteria: {
    label: string;
    focusedValue: string;
    bestValue: string;
    bestFreelancerName: string;
    verdict: AiCompareVerdict;
  }[];
  competitors: {
    quoteId: string;
    name: string;
    overallScore: number;
    oneLiner: string;
  }[];
  recommendation: {
    suggestedQuoteId: string | null;
    suggestedFreelancerName: string;
    confidence: AiCompareConfidence;
    reasoning: string;
    actionTips: string[];
  };
};

export type AiQuoteCompareResult = {
  model: string;
  job: {
    id: string;
    title: string | null;
    budget: number | null;
    budget_type: string;
  };
  focusedQuoteId: string;
  totalQuotes: number;
  analysis: AiQuoteCompareAnalysis;
};

export async function compareJobQuoteWithAi(quoteId: string) {
  const { data } = await fetchApi<AiQuoteCompareResult>(apiPaths.jobs.quoteAiCompare(quoteId), {
    method: "POST",
    auth: true,
  });
  return data;
}

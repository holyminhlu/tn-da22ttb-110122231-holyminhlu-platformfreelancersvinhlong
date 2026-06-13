declare module "react-payment-inputs/images" {
  const images: Record<string, React.ReactNode>;
  export default images;
}

declare module "react-payment-inputs" {
  import type { InputHTMLAttributes, SVGAttributes } from "react";

  type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
    refKey?: string;
  };

  type CardImageProps = SVGAttributes<SVGSVGElement> & {
    images?: Record<string, React.ReactNode>;
  };

  export function usePaymentInputs(options?: Record<string, unknown>): {
    meta: {
      cardType?: { type: string; displayName: string };
      erroredInputs: Record<string, string | undefined>;
      focused?: string;
    };
    getCardNumberProps: (props?: FieldProps) => FieldProps;
    getExpiryDateProps: (props?: FieldProps) => FieldProps;
    getCVCProps: (props?: FieldProps) => FieldProps;
    getCardImageProps: (props?: CardImageProps) => CardImageProps;
    wrapperProps: Record<string, unknown>;
  };
}

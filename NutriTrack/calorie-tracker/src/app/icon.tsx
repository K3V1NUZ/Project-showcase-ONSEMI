import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// The paths here are the same shapes as public/logo.svg — text has been
// converted to paths so nothing depends on the Bauhaus font at render time.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 90.83 90.83"
          width={192}
          height={192}
        >
          <path fill="#006a3f" d="M47,66a6.87,6.87,0,1,1-13.73,0Z" />
          <path
            fill="#006a3f"
            d="M13.88,66v-22a12.56,12.56,0,0,1,3.47-9.27,12.43,12.43,0,0,1,9.24-3.49q5.75,0,8.79,3.39t3,9.72V66H28.33V44.29c0-2.07-.74-3.11-2.22-3.11S24,42.22,24,44.29V66Z"
          />
          <path
            fill="#00a54e"
            d="M18.88,66V44a12.53,12.53,0,0,1,3.47-9.28,12.46,12.46,0,0,1,9.24-3.48q5.75,0,8.79,3.38t3,9.73V66H33.33V44.3c0-2.08-.74-3.11-2.22-3.11S29,42.22,29,44.3V66Z"
          />
          <path
            fill="#006a3f"
            d="M61.15,31.77V66H46.88V31.77H36V18h36.1V31.77Z"
          />
          <path
            fill="#00a54e"
            d="M66.05,31.77V66H51.77V31.77H40.84V18h36.1V31.77Z"
          />
          <path fill="#00a54e" d="M51.83,66a4.19,4.19,0,1,1-8.37,0Z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}

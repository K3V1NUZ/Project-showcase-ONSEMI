import type { MealType } from "@/lib/types";

type Props = {
  type: MealType;
  className?: string;
  size?: number;
};

// All icons inherit colour via currentColor, so in dark mode they pick up
// whatever the surrounding text colour is (near-white on the day view).
export function MealIcon({ type, className, size = 20 }: Props) {
  switch (type) {
    case "breakfast":
      // Coffee mug — outline.
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <path d="M3 9C3 8.06812 3 7.60218 3.15224 7.23463C3.35523 6.74458 3.74458 6.35523 4.23463 6.15224C4.60218 6 5.06812 6 6 6H10H14C14.9319 6 15.3978 6 15.7654 6.15224C16.2554 6.35523 16.6448 6.74458 16.8478 7.23463C17 7.60218 17 8.06812 17 9V15.6667C17 20 16.15 21 10 21C3.84999 21 3 20 3 15.6667V9Z" />
          <path
            d="M17 9H19C20.1046 9 21 9.89543 21 11V14C21 15.1046 20.1046 16 19 16H17"
            strokeLinecap="round"
          />
        </svg>
      );

    case "lunch":
      // Pot — filled with even-odd rule so the interior reads as a cutout.
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M20,11 L20,18 C20,19.1045695 19.1045695,20 18,20 L6,20 C4.8954305,20 4,19.1045695 4,18 L4,11 L3,11 C2.44771525,11 2,10.5522847 2,10 C2,9.44771525 2.44771525,9 3,9 L21,9 C21.5522847,9 22,9.44771525 22,10 C22,10.5522847 21.5522847,11 21,11 L20,11 Z M6,11 L6,18 L18,18 L18,11 L6,11 Z M11,6 L11,5 C11,4.44771525 11.4477153,4 12,4 C12.5522847,4 13,4.44771525 13,5 L13,6 L19,6 C19.5522847,6 20,6.44771525 20,7 C20,7.55228475 19.5522847,8 19,8 L5,8 C4.44771525,8 4,7.55228475 4,7 C4,6.44771525 4.44771525,6 5,6 L11,6 Z"
          />
        </svg>
      );

    case "dinner":
      // Bread loaf — outline.
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <path d="M21 7C21 5.34315 19.6569 4 18 4H6C4.34315 4 3 5.34315 3 7V8.4C3 9.28366 3.71634 10 4.6 10C4.82091 10 5 10.1791 5 10.4V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V10.4C19 10.1791 19.1791 10 19.4 10C20.2837 10 21 9.28366 21 8.4V7Z" />
        </svg>
      );

    case "snack":
      // Wrapped candy — outline (native 16x16 viewBox).
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <circle cx="8" cy="8" r="3.25" />
          <path d="m7.25 11.25c0 1-.5 2.5-1.5 3-.75 0-1.5-1-2-2-1-.5-2-1.5-2-2 .5-1 2-1.5 3-1.5m4-4c0-1 .5-2.5 1.5-3 .75 0 1.5 1 2 2 1 .5 2 1.5 2 2-.5 1-2 1.5-3 1.5" />
        </svg>
      );
  }
}

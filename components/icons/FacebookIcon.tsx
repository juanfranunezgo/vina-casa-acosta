import type { ComponentProps } from "react";

export default function FacebookIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.8 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5H17V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.2H7.8V13h2.7v8h3.3Z" />
    </svg>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";

interface ReciterAvatarProps {
  src: string;
  alt: string;
  size: number;
  className?: string;
}

export default function ReciterAvatar({ src, alt, size, className = "" }: ReciterAvatarProps) {
  const [errored, setErrored] = useState(false);
  const fallback = "/reciters_images/default.png";
  const effectiveSrc = errored ? fallback : src;
  const isProtocol = effectiveSrc.startsWith("munajjam://");

  if (isProtocol) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={effectiveSrc}
        alt={alt}
        width={size}
        height={size}
        className={className}
        onError={() => {
          if (!errored) setErrored(true);
        }}
      />
    );
  }

  return (
    <Image
      src={effectiveSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={() => {
        if (!errored) setErrored(true);
      }}
    />
  );
}

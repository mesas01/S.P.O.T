import React from "react";
import { Text } from "@stellar/design-system";

type Bullet = string | { label: string; detail?: string };

interface TldrCardProps {
  label?: string;
  title?: string;
  summary?: string;
  bullets?: Bullet[];
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const TldrCard: React.FC<TldrCardProps> = ({
  label = "TL;DR",
  title,
  summary,
  bullets = [],
  footer,
  children,
  className,
}) => {
  const containerClassName = [
    "brand-tldr",
    "w-full",
    "md:max-w-none",
    "xl:max-w-5xl",
    "2xl:max-w-6xl",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={containerClassName}>
      {label && (
        <Text as="span" size="xs" className="brand-eyebrow text-stellar-navy/70">
          {label}
        </Text>
      )}

      {title && (
        <Text as="h3" size="md" className="text-xl font-headline text-stellar-black mt-2">
          {title}
        </Text>
      )}

      {summary && (
        <Text as="p" size="sm" className="mt-2 text-sm text-stellar-black/80 font-body">
          {summary}
        </Text>
      )}

      {bullets.length > 0 && (
        <ul className="mt-4 grid gap-4 text-sm font-body text-stellar-black md:grid-cols-2">
          {bullets.map((bullet, index) => {
            const key = typeof bullet === "string" ? `${index}-${bullet.slice(0, 10)}` : `${index}-${bullet.label}`;
            return (
              <li key={key} className="flex gap-3 items-start">
                <span className="mt-2 h-2 w-2 rounded-full bg-stellar-black/50" />
                <div>
                  {typeof bullet === "string" ? (
                    <p className="text-stellar-black/80">{bullet}</p>
                  ) : (
                    <>
                      <p className="font-semibold text-stellar-black">{bullet.label}</p>
                      {bullet.detail && (
                        <p className="text-stellar-black/70">{bullet.detail}</p>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {children && (
        <div className="mt-4 text-sm text-stellar-black/80 font-body">
          {children}
        </div>
      )}

      {footer && (
        <div className="mt-4 pt-4 border-t border-stellar-black/10 text-xs text-stellar-black/60">
          {footer}
        </div>
      )}
    </aside>
  );
};

export default TldrCard;


